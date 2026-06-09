import { NextResponse } from "next/server";

import {
  createCheckoutOrder,
  getCheckoutOrderWhatsAppSummary,
  updateCheckoutNotificationFromWhatsAppResult,
} from "@/features/orders/queries";
import {
  checkCheckoutRateLimit,
  checkoutLimits,
  checkoutRequestSchema,
  isMissingEnvError,
  toCheckoutOrderInput,
} from "@/lib/checkout";
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

    if (!result.reused) {
      try {
        const summary = await getCheckoutOrderWhatsAppSummary(result.order_id);
        notificationResult = await sendOrderWhatsAppNotification(summary);
        await updateCheckoutNotificationFromWhatsAppResult(result.order_id, notificationResult);
      } catch {
        notificationResult = { status: "failed", reason: "network_error" };
      }
    }

    return NextResponse.json({
      orderId: result.order_id,
      orderReference: result.order_reference,
      totalCents: result.total_cents,
      currency: result.currency,
      reused: result.reused,
      notificationStatus: notificationResult?.status ?? (result.reused ? "skipped" : "pending"),
      whatsappFallbackUrl: notificationResult ? fallbackUrlFor(notificationResult) : null,
    });
  } catch (error) {
    if (isMissingEnvError(error)) {
      return NextResponse.json({ error: "Checkout ожидает настройку окружения" }, { status: 503 });
    }

    return NextResponse.json({ error: "Не удалось создать заказ" }, { status: 502 });
  }
}
