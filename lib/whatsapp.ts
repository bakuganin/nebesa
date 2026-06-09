import { createHmac, timingSafeEqual } from "node:crypto";

import { createClient } from "@supabase/supabase-js";

type EnvMap = Record<string, string | undefined>;

export type OrderWhatsAppItem = {
  name: string;
  quantity: number;
  unitPriceCents: number;
  totalPriceCents?: number;
  options?: string[];
};

export type OrderWhatsAppSummary = {
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  deliveryAddress?: string;
  totalCents: number;
  currency: string;
  items: OrderWhatsAppItem[];
  notes?: string;
};

export type WhatsAppSendResult =
  | {
      status: "sent";
      providerMessageId?: string;
    }
  | {
      status: "skipped";
      reason: "missing_cloud_api_config" | "missing_recipient";
      fallbackUrl?: string | null;
    }
  | {
      status: "failed";
      reason: "graph_api_error" | "network_error";
      httpStatus?: number;
      fallbackUrl?: string | null;
    };

export type WhatsAppWebhookSummary = {
  direction: "inbound" | "status";
  eventType: "message" | "status" | "unknown";
  phone?: string;
  providerMessageId?: string;
};

export type WhatsAppStorageResult =
  | { status: "stored"; eventId?: string }
  | { status: "skipped"; reason: "missing_storage_config" }
  | { status: "failed"; reason: "storage_error" };

type SendOptions = {
  env?: EnvMap;
  fetcher?: typeof fetch;
  graphApiVersion?: string;
};

function envValue(env: EnvMap, key: string) {
  const value = env[key];
  return value && value.trim().length > 0 ? value.trim() : undefined;
}

function readEnv(): EnvMap {
  return typeof process === "undefined" ? {} : process.env;
}

function normalizePhone(phone: string) {
  return phone.replace(/\D/g, "");
}

function formatMoney(cents: number, currency: string) {
  const amount = cents / 100;

  return `${amount.toLocaleString("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${currency}`;
}

function getNestedArray(value: unknown, key: string): unknown[] {
  if (!value || typeof value !== "object" || !(key in value)) {
    return [];
  }

  const property = (value as Record<string, unknown>)[key];
  return Array.isArray(property) ? property : [];
}

function firstString(value: unknown, key: string): string | undefined {
  if (!value || typeof value !== "object" || !(key in value)) {
    return undefined;
  }

  const property = (value as Record<string, unknown>)[key];
  return typeof property === "string" && property.trim().length > 0 ? property : undefined;
}

export function verifyWhatsAppSignature(rawBody: string, signatureHeader: string | null, appSecret: string | undefined) {
  if (!signatureHeader || !appSecret) {
    return false;
  }

  const prefix = "sha256=";
  if (!signatureHeader.startsWith(prefix)) {
    return false;
  }

  const signature = signatureHeader.slice(prefix.length);
  if (!/^[a-f0-9]{64}$/i.test(signature)) {
    return false;
  }

  const expected = Buffer.from(createHmac("sha256", appSecret).update(rawBody).digest("hex"), "hex");
  const actual = Buffer.from(signature, "hex");

  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function formatOrderWhatsAppMessage(order: OrderWhatsAppSummary) {
  const lines = [
    "NEBESA: новый заказ",
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

  lines.push("", "Состав заказа:");

  for (const item of order.items) {
    const total = item.totalPriceCents ?? item.unitPriceCents * item.quantity;
    lines.push(`- ${item.quantity} x ${item.name}: ${formatMoney(total, order.currency)}`);

    if (item.options?.length) {
      lines.push(`  ${item.options.join(", ")}`);
    }
  }

  lines.push("", `Итого: ${formatMoney(order.totalCents, order.currency)}`);

  if (order.notes) {
    lines.push(`Комментарий: ${order.notes}`);
  }

  return lines.join("\n");
}

export function createWhatsAppFallbackUrl(phone: string | undefined, message: string) {
  if (!phone) {
    return null;
  }

  const normalizedPhone = normalizePhone(phone);
  if (!normalizedPhone) {
    return null;
  }

  return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}`;
}

export async function sendWhatsAppText(
  input: { to: string | undefined; message: string },
  options: SendOptions = {},
): Promise<WhatsAppSendResult> {
  const env = options.env ?? readEnv();
  const phoneNumberId = envValue(env, "WA_PHONE_NUMBER_ID");
  const accessToken = envValue(env, "WA_ACCESS_TOKEN");
  const recipient = input.to ? normalizePhone(input.to) : "";

  if (!recipient) {
    return { status: "skipped", reason: "missing_recipient" };
  }

  if (!phoneNumberId || !accessToken) {
    return { status: "skipped", reason: "missing_cloud_api_config" };
  }

  const fetcher = options.fetcher ?? fetch;
  const graphApiVersion = options.graphApiVersion ?? "v20.0";

  try {
    const response = await fetcher(`https://graph.facebook.com/${graphApiVersion}/${phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${accessToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: recipient,
        type: "text",
        text: {
          preview_url: false,
          body: input.message,
        },
      }),
    });

    const responseBody = (await response.json().catch(() => null)) as
      | { messages?: Array<{ id?: string }> }
      | null;

    if (!response.ok) {
      return { status: "failed", reason: "graph_api_error", httpStatus: response.status };
    }

    return {
      status: "sent",
      providerMessageId: responseBody?.messages?.[0]?.id,
    };
  } catch {
    return { status: "failed", reason: "network_error" };
  }
}

export async function sendOrderWhatsAppNotification(
  order: OrderWhatsAppSummary,
  options: SendOptions = {},
): Promise<WhatsAppSendResult> {
  const env = options.env ?? readEnv();
  const message = formatOrderWhatsAppMessage(order);
  const trustedPhone = envValue(env, "WA_TRUSTED_PHONE");
  const fallbackUrl = createWhatsAppFallbackUrl(trustedPhone, message);
  const result = await sendWhatsAppText({ to: trustedPhone, message }, options);

  if (result.status === "sent") {
    return result;
  }

  return { ...result, fallbackUrl };
}

export function summarizeWhatsAppWebhookPayload(payload: unknown): WhatsAppWebhookSummary {
  const entries = getNestedArray(payload, "entry");

  for (const entry of entries) {
    for (const change of getNestedArray(entry, "changes")) {
      const value = change && typeof change === "object" ? (change as Record<string, unknown>).value : undefined;
      const messages = getNestedArray(value, "messages");
      const statuses = getNestedArray(value, "statuses");

      if (messages.length > 0) {
        const message = messages[0];
        return {
          direction: "inbound",
          eventType: "message",
          phone: firstString(message, "from"),
          providerMessageId: firstString(message, "id"),
        };
      }

      if (statuses.length > 0) {
        const status = statuses[0];
        return {
          direction: "status",
          eventType: "status",
          phone: firstString(status, "recipient_id"),
          providerMessageId: firstString(status, "id"),
        };
      }
    }
  }

  return {
    direction: "inbound",
    eventType: "unknown",
  };
}

export async function storeWhatsAppWebhookPayload(
  payload: unknown,
  summary: WhatsAppWebhookSummary,
  options: { env?: EnvMap } = {},
): Promise<WhatsAppStorageResult> {
  const env = options.env ?? readEnv();
  const supabaseUrl = envValue(env, "NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = envValue(env, "SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    return { status: "skipped", reason: "missing_storage_config" };
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { data, error } = await supabase
    .from("whatsapp_events")
    .insert({
      direction: summary.direction,
      event_type: summary.eventType,
      phone: summary.phone ?? null,
      payload,
      processed_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error) {
    return { status: "failed", reason: "storage_error" };
  }

  return { status: "stored", eventId: typeof data?.id === "string" ? data.id : undefined };
}
