import "server-only";

import { getAdminOrderById, getAdminOrders } from "@/features/orders/queries";

import { adminReadRoles } from "./access";
import { runAdminQuery, type AdminQueryResult } from "./safe-query";

export type AdminOrderStatus = "new" | "confirmed" | "in_progress" | "completed" | "cancelled";

export type AdminOrderListItem = {
  id: string;
  order_reference: string;
  status: AdminOrderStatus;
  notification_status: string;
  total_cents: number;
  currency: string;
  created_at: string;
  customer: {
    full_name: string;
    phone: string;
    email: string | null;
  } | null;
};

export type AdminOrderItem = {
  id: string;
  product_snapshot: Record<string, unknown>;
  variant_snapshot: Record<string, unknown> | null;
  material_snapshot: Record<string, unknown> | null;
  unit_price_cents: number;
  quantity: number;
  line_total_cents: number;
  currency: string;
  options?: Array<{
    option_group_snapshot: Record<string, unknown>;
    option_value_snapshot: Record<string, unknown>;
    price_delta_cents: number;
  }>;
};

export type AdminOrderDetail = {
  id: string;
  order_reference: string;
  status: AdminOrderStatus;
  notification_status: string;
  subtotal_cents: number;
  total_cents: number;
  currency: string;
  customer_note: string | null;
  internal_note: string | null;
  created_at: string;
  updated_at: string;
  customer: {
    full_name: string;
    phone: string;
    email: string | null;
    address: string | null;
  } | null;
  items: AdminOrderItem[];
  status_events: Array<{
    id: string;
    status: AdminOrderStatus;
    note: string | null;
    created_at: string;
  }>;
  notifications: Array<{
    id: string;
    channel: string;
    status: string;
    attempt_count: number;
    error_message: string | null;
    created_at: string;
  }>;
};

export type AdminOrdersPageData = {
  orders: AdminOrderListItem[];
  count: number;
};

export type AdminOrderDetailPageData = {
  order: AdminOrderDetail | null;
};

const emptyOrdersPageData: AdminOrdersPageData = {
  orders: [],
  count: 0,
};

const emptyOrderDetailPageData: AdminOrderDetailPageData = {
  order: null,
};

export async function getAdminOrdersPageData(
  status?: AdminOrderStatus,
): Promise<AdminQueryResult<AdminOrdersPageData>> {
  return runAdminQuery(emptyOrdersPageData, async () => {
    const { orders, count } = await getAdminOrders({ status, limit: 50 });

    return {
      orders: orders as unknown as AdminOrderListItem[],
      count,
    };
  }, adminReadRoles);
}

export async function getAdminOrderDetailPageData(
  orderId: string,
): Promise<AdminQueryResult<AdminOrderDetailPageData>> {
  return runAdminQuery(emptyOrderDetailPageData, async () => {
    const order = await getAdminOrderById(orderId);

    return {
      order: (order ?? null) as unknown as AdminOrderDetail | null,
    };
  }, adminReadRoles);
}

export function snapshotTitle(snapshot: Record<string, unknown> | null | undefined): string {
  const title = snapshot?.title;
  return typeof title === "string" && title.trim().length > 0 ? title : "Позиция заказа";
}
