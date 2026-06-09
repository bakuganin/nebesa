import "server-only";

import {
  callCheckoutOrderRpc,
  createAuthorizedAdminClient,
  type AdminRole,
} from "../../lib/supabase/admin";

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
        customer:customers(id, full_name, phone, email)
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
