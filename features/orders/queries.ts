import "server-only";

import {
  callCheckoutOrderRpc,
  createAuthorizedAdminClient,
  createServiceRoleClient,
  type AdminRole,
} from "../../lib/supabase/admin";
import type { EmailSendResult } from "../../lib/email";
import type { OrderWhatsAppSummary, WhatsAppSendResult } from "../../lib/whatsapp";

export type CheckoutOrderInput = {
  idempotencyKey: string;
  customer: {
    fullName: string;
    phone: string;
    email?: string;
    address?: string;
    metadata?: Record<string, unknown>;
  };
  items: Array<{
    productId: string;
    orderMode: "priced" | "inquiry_only";
    variantId?: string;
    materialId?: string;
    quantity: number;
    options?: Array<{
      groupId: string;
      valueId: string;
    }>;
  }>;
  customerNote?: string;
  requestContext?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
};

export type CheckoutOrderResult = {
  order_id: string;
  order_reference: string;
  total_cents: number;
  currency: string;
  reused: boolean;
};

export type CheckoutNotificationStatus = "pending" | "sent" | "failed" | "skipped";

export type AdminOrderListParams = {
  status?: "new" | "confirmed" | "in_progress" | "completed" | "cancelled";
  page?: number;
  limit?: number;
};

const orderReadRoles: AdminRole[] = ["owner", "admin", "operator"];

function normalizePage(page: number | undefined): number {
  return Math.max(1, Math.floor(page ?? 1));
}

function normalizeLimit(limit: number | undefined): number {
  return Math.min(100, Math.max(1, Math.floor(limit ?? 25)));
}

function toCheckoutRpcPayload(input: CheckoutOrderInput) {
  return {
    idempotency_key: input.idempotencyKey,
    customer: {
      full_name: input.customer.fullName,
      phone: input.customer.phone,
      email: input.customer.email,
      address: input.customer.address,
      metadata: input.customer.metadata ?? {},
    },
    items: input.items.map((item) => ({
      product_id: item.productId,
      order_mode: item.orderMode,
      variant_id: item.variantId,
      material_id: item.materialId,
      quantity: item.quantity,
      options: (item.options ?? []).map((option) => ({
        group_id: option.groupId,
        value_id: option.valueId,
      })),
    })),
    customer_note: input.customerNote,
    request_context: input.requestContext ?? {},
    metadata: input.metadata ?? {},
  };
}

export async function createCheckoutOrder(
  input: CheckoutOrderInput,
): Promise<CheckoutOrderResult> {
  const data = await callCheckoutOrderRpc(toCheckoutRpcPayload(input));

  return data as CheckoutOrderResult;
}

function snapshotString(value: unknown, key: string): string | undefined {
  if (!value || typeof value !== "object" || !(key in value)) {
    return undefined;
  }

  const property = (value as Record<string, unknown>)[key];
  return typeof property === "string" && property.trim().length > 0 ? property : undefined;
}

function optionLabel(option: unknown): string | null {
  if (!option || typeof option !== "object") {
    return null;
  }

  const row = option as Record<string, unknown>;
  const groupTitle = snapshotString(row.option_group_snapshot, "title");
  const valueTitle = snapshotString(row.option_value_snapshot, "title");

  if (!groupTitle && !valueTitle) {
    return null;
  }

  return [groupTitle, valueTitle].filter(Boolean).join(": ");
}

export async function getCheckoutOrderWhatsAppSummary(orderId: string): Promise<OrderWhatsAppSummary> {
  const { data, error } = await createServiceRoleClient()
    .from("orders")
    .select(
      `
        order_reference,
        total_cents,
        currency,
        customer_note,
        customer:customers(full_name, phone, email, address),
        items:order_items(
          quantity,
          unit_price_cents,
          line_total_cents,
          product_snapshot,
          options:order_item_options(option_group_snapshot, option_value_snapshot)
        )
      `,
    )
    .eq("id", orderId)
    .single();

  if (error) {
    throw error;
  }

  const order = data as {
    order_reference: string;
    total_cents: number;
    currency: string;
    customer_note: string | null;
    customer:
      | {
          full_name: string;
          phone: string;
          email: string | null;
          address: string | null;
        }
      | Array<{
          full_name: string;
          phone: string;
          email: string | null;
          address: string | null;
        }>;
    items: Array<{
      quantity: number;
      unit_price_cents: number;
      line_total_cents: number;
      product_snapshot: Record<string, unknown>;
      options?: unknown[];
    }>;
  };
  const customer = Array.isArray(order.customer) ? order.customer[0] : order.customer;

  return {
    orderNumber: order.order_reference,
    customerName: customer.full_name,
    customerPhone: customer.phone,
    customerEmail: customer.email ?? undefined,
    deliveryAddress: customer.address ?? undefined,
    totalCents: order.total_cents,
    currency: order.currency,
    items: order.items.map((item) => ({
      name: snapshotString(item.product_snapshot, "title") ?? "Товар",
      quantity: item.quantity,
      orderMode:
        snapshotString(item.product_snapshot, "order_mode") === "inquiry_only"
          ? "inquiry_only"
          : "priced",
      unitPriceCents: item.unit_price_cents,
      totalPriceCents: item.line_total_cents,
      options: (item.options ?? []).map(optionLabel).filter((label): label is string => Boolean(label)),
    })),
    notes: order.customer_note ?? undefined,
  };
}

export async function updateCheckoutNotificationFromWhatsAppResult(
  orderId: string,
  result: WhatsAppSendResult,
): Promise<void> {
  await updateCheckoutNotificationResult(orderId, "whatsapp", result);
}

export async function updateCheckoutNotificationFromEmailResult(
  orderId: string,
  result: EmailSendResult,
): Promise<void> {
  await updateCheckoutNotificationResult(orderId, "email", result);
}

async function updateCheckoutNotificationResult(
  orderId: string,
  channel: "whatsapp" | "email",
  result: WhatsAppSendResult | EmailSendResult,
): Promise<void> {
  const supabase = createServiceRoleClient();
  const now = new Date().toISOString();
  const payload =
    result.status === "sent"
      ? { status: result.status, providerMessageId: result.providerMessageId ?? null }
      : {
          status: result.status,
          reason: result.reason,
          httpStatus: "httpStatus" in result ? result.httpStatus ?? null : null,
          fallbackUrl: "fallbackUrl" in result ? result.fallbackUrl ?? null : null,
        };
  const errorMessage =
    result.status === "sent"
      ? null
      : "httpStatus" in result && result.httpStatus
        ? `${result.reason}:${result.httpStatus}`
        : result.reason;

  const { error: notificationError } = await supabase
    .from("checkout_notifications")
    .update({
      status: result.status,
      attempt_count: 1,
      sent_at: result.status === "sent" ? now : null,
      payload,
      error_message: errorMessage,
    })
    .eq("order_id", orderId)
    .eq("channel", channel);

  if (notificationError) {
    throw notificationError;
  }
}

export async function updateCheckoutOrderNotificationStatus(
  orderId: string,
  status: CheckoutNotificationStatus,
): Promise<void> {
  const { error: orderError } = await createServiceRoleClient()
    .from("orders")
    .update({
      notification_status: status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId);

  if (orderError) {
    throw orderError;
  }
}

export async function getAdminOrders(params: AdminOrderListParams = {}) {
  const { supabase } = await createAuthorizedAdminClient(orderReadRoles);
  const page = normalizePage(params.page);
  const limit = normalizeLimit(params.limit);
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase
    .from("orders")
    .select(
      `
        id,
        order_reference,
        status,
        notification_status,
        total_cents,
        currency,
        created_at,
        customer:customers(id, full_name, phone, email),
        items:order_items(line_total_cents, product_snapshot)
      `,
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range(from, to);

  if (params.status) {
    query = query.eq("status", params.status);
  }

  const { data, error, count } = await query;

  if (error) {
    throw error;
  }

  return {
    orders: data ?? [],
    count: count ?? 0,
  };
}

export async function getAdminOrderById(orderId: string) {
  const { supabase } = await createAuthorizedAdminClient(orderReadRoles);
  const { data, error } = await supabase
    .from("orders")
    .select(
      `
        *,
        customer:customers(*),
        items:order_items(*, options:order_item_options(*)),
        status_events:order_status_events(*),
        notifications:checkout_notifications(*)
      `,
    )
    .eq("id", orderId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}
