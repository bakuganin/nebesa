import type { OrderWhatsAppSummary } from "./whatsapp";

type EnvMap = Record<string, string | undefined>;

type SendOptions = {
  env?: EnvMap;
  fetcher?: typeof fetch;
};

export type EmailSendResult =
  | {
      status: "sent";
      providerMessageId?: string;
    }
  | {
      status: "skipped";
      reason: "missing_resend_config" | "missing_recipient" | "missing_sender";
    }
  | {
      status: "failed";
      reason: "resend_api_error" | "network_error";
      httpStatus?: number;
    };

function readEnv(): EnvMap {
  return typeof process === "undefined" ? {} : process.env;
}

function envValue(env: EnvMap, key: string) {
  const value = env[key];
  return value && value.trim().length > 0 ? value.trim() : undefined;
}

function recipientList(value: string | undefined) {
  return (value ?? "")
    .split(",")
    .map((recipient) => recipient.trim())
    .filter(Boolean);
}

function formatMoney(cents: number, currency: string) {
  const amount = cents / 100;

  return `${amount.toLocaleString("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${currency}`;
}

export function formatOrderEmailText(order: OrderWhatsAppSummary) {
  const lines = [
    "NEBESA: новая заявка",
    `Заказ: ${order.orderNumber}`,
    `Клиент: ${order.customerName}`,
    `Телефон: ${order.customerPhone}`,
  ];

  if (order.customerEmail) {
    lines.push(`Email: ${order.customerEmail}`);
  }

  if (order.deliveryAddress) {
    lines.push(`Адрес: ${order.deliveryAddress}`);
  }

  lines.push("", "Состав заявки:");

  for (const item of order.items) {
    const total = item.totalPriceCents ?? item.unitPriceCents * item.quantity;
    const price = total > 0 ? formatMoney(total, order.currency) : "цена по запросу";
    lines.push(`- ${item.quantity} x ${item.name}: ${price}`);

    if (item.options?.length) {
      lines.push(`  ${item.options.join(", ")}`);
    }
  }

  lines.push("", `Итого по фиксированным позициям: ${formatMoney(order.totalCents, order.currency)}`);

  if (order.notes) {
    lines.push(`Комментарий: ${order.notes}`);
  }

  return lines.join("\n");
}

export async function sendOrderEmailNotification(
  order: OrderWhatsAppSummary,
  options: SendOptions = {},
): Promise<EmailSendResult> {
  const env = options.env ?? readEnv();
  const apiKey = envValue(env, "RESEND_API_KEY");
  const from = envValue(env, "ORDER_EMAIL_FROM");
  const to = recipientList(envValue(env, "ORDER_EMAIL_TO"));

  if (to.length === 0) {
    return { status: "skipped", reason: "missing_recipient" };
  }

  if (!from) {
    return { status: "skipped", reason: "missing_sender" };
  }

  if (!apiKey) {
    return { status: "skipped", reason: "missing_resend_config" };
  }

  const fetcher = options.fetcher ?? fetch;

  try {
    const response = await fetcher("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from,
        to,
        subject: `NEBESA: новая заявка ${order.orderNumber}`,
        text: formatOrderEmailText(order),
      }),
    });

    const responseBody = (await response.json().catch(() => null)) as { id?: string } | null;

    if (!response.ok) {
      return { status: "failed", reason: "resend_api_error", httpStatus: response.status };
    }

    return { status: "sent", providerMessageId: responseBody?.id };
  } catch {
    return { status: "failed", reason: "network_error" };
  }
}
