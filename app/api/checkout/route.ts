import { NextResponse } from "next/server";

import {
  createCheckoutOrder,
  getCheckoutOrderWhatsAppSummary,
  updateCheckoutNotificationFromEmailResult,
  updateCheckoutNotificationFromWhatsAppResult,
  updateCheckoutOrderNotificationStatus,
  type CheckoutNotificationStatus,
} from "@/features/orders/queries";
import {
  checkCheckoutRateLimit,
  checkoutLimits,
  checkoutRequestSchema,
  isMissingEnvError,
  toCheckoutOrderInput,
} from "@/lib/checkout";
import { sendOrderEmailNotification, type EmailSendResult } from "@/lib/email";
import { sendOrderWhatsAppNotification, type WhatsAppSendResult } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

function requestIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "local"
  );
}

function fallbackUrlFor(result: WhatsAppSendResult): string | null {
  return result.status === "sent" ? null : result.fallbackUrl ?? null;
}

function aggregateNotificationStatus(
  results: Array<WhatsAppSendResult | EmailSendResult | null>,
): CheckoutNotificationStatus {
  const deliveredResults = results.filter((result): result is WhatsAppSendResult | EmailSendResult => Boolean(result));

  if (deliveredResults.some((result) => result.status === "sent")) {
    return "sent";
  }

  if (deliveredResults.length > 0 && deliveredResults.every((result) => result.status === "skipped")) {
    return "skipped";
  }

  if (deliveredResults.some((result) => result.status === "failed")) {
    return "failed";
  }

  return "pending";
}

async function safeUpdateNotification(
  orderId: string,
  result: WhatsAppSendResult | EmailSendResult,
  channel: "whatsapp" | "email",
) {
  try {
    if (channel === "whatsapp") {
      await updateCheckoutNotificationFromWhatsAppResult(orderId, result as WhatsAppSendResult);
    } else {
      await updateCheckoutNotificationFromEmailResult(orderId, result as EmailSendResult);
    }
  } catch {
    // Order creation is the source of truth; notification bookkeeping must not break checkout.
  }
}

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);

  if (contentLength > checkoutLimits.maxPayloadBytes) {
    return NextResponse.json({ error: "Слишком большой запрос" }, { status: 413 });
  }

  const rateLimit = checkCheckoutRateLimit(requestIp(request));
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Слишком много попыток. Повторите позже." },
      {
        status: 429,
        headers: { "Retry-After": String(rateLimit.retryAfterSeconds) },
      },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Некорректный JSON" }, { status: 400 });
  }

  const parsed = checkoutRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Проверьте данные заказа" }, { status: 400 });
  }

  try {
    const result = await createCheckoutOrder(
      toCheckoutOrderInput(parsed.data, {
        ip: requestIp(request),
        userAgent: request.headers.get("user-agent"),
      }),
    );

    let notificationResult: WhatsAppSendResult | null = null;
    let emailNotificationResult: EmailSendResult | null = null;
    let aggregateStatus: CheckoutNotificationStatus = result.reused ? "skipped" : "pending";

    if (!result.reused) {
      let summary: Awaited<ReturnType<typeof getCheckoutOrderWhatsAppSummary>> | null = null;

      try {
        summary = await getCheckoutOrderWhatsAppSummary(result.order_id);
      } catch {
        notificationResult = { status: "failed", reason: "network_error" };
        emailNotificationResult = { status: "failed", reason: "network_error" };
        await safeUpdateNotification(result.order_id, notificationResult, "whatsapp");
        await safeUpdateNotification(result.order_id, emailNotificationResult, "email");
      }

      if (summary) {
        try {
          notificationResult = await sendOrderWhatsAppNotification(summary);
        } catch {
          notificationResult = { status: "failed", reason: "network_error" };
        }
        await safeUpdateNotification(result.order_id, notificationResult, "whatsapp");

        try {
          emailNotificationResult = await sendOrderEmailNotification(summary);
        } catch {
          emailNotificationResult = { status: "failed", reason: "network_error" };
        }
        await safeUpdateNotification(result.order_id, emailNotificationResult, "email");
      }

      aggregateStatus = aggregateNotificationStatus([notificationResult, emailNotificationResult]);
      await updateCheckoutOrderNotificationStatus(result.order_id, aggregateStatus).catch(() => undefined);
    }

    return NextResponse.json({
      orderId: result.order_id,
      orderReference: result.order_reference,
      totalCents: result.total_cents,
      currency: result.currency,
      reused: result.reused,
      notificationStatus: aggregateStatus,
      whatsappNotificationStatus: notificationResult?.status ?? (result.reused ? "skipped" : "pending"),
      emailNotificationStatus: emailNotificationResult?.status ?? (result.reused ? "skipped" : "pending"),
      whatsappFallbackUrl: notificationResult ? fallbackUrlFor(notificationResult) : null,
    });
  } catch (error) {
    if (isMissingEnvError(error)) {
      return NextResponse.json({ error: "Checkout ожидает настройку окружения" }, { status: 503 });
    }

    return NextResponse.json({ error: "Не удалось создать заказ" }, { status: 502 });
  }
}
