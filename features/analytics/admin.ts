import "server-only";

import { adminReadRoles } from "@/features/admin/access";
import { runAdminQuery, type AdminQueryResult } from "@/features/admin/safe-query";

export type AdminDashboardData = {
  metrics: {
    newOrders: number;
    orders30d: number;
    revenue30dCents: number;
    completedRevenue30dCents: number;
    averageOrderCents: number;
    itemsSold30d: number;
    productsNeedReview: number;
    failedNotifications: number;
  };
  recentOrders: Array<{
    id: string;
    order_reference: string;
    status: string;
    total_cents: number;
    currency: string;
    created_at: string;
  }>;
  orderStatusCounts: Record<string, number>;
  topProducts30d: Array<{
    title: string;
    quantity: number;
    revenueCents: number;
  }>;
};

const emptyDashboardData: AdminDashboardData = {
  metrics: {
    newOrders: 0,
    orders30d: 0,
    revenue30dCents: 0,
    completedRevenue30dCents: 0,
    averageOrderCents: 0,
    itemsSold30d: 0,
    productsNeedReview: 0,
    failedNotifications: 0,
  },
  recentOrders: [],
  orderStatusCounts: {},
  topProducts30d: [],
};

type OrderMetricRow = {
  id: string;
  order_reference: string;
  status: string;
  total_cents: number;
  currency: string;
  created_at: string;
  items?: OrderItemMetricRow[];
};

type OrderItemMetricRow = {
  quantity: number;
  line_total_cents: number;
  product_snapshot: Record<string, unknown>;
};

function daysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
}

function productTitle(snapshot: Record<string, unknown>): string {
  const title = snapshot.title;
  return typeof title === "string" && title.trim().length > 0 ? title : "Товар";
}

export async function getAdminDashboardData(): Promise<AdminQueryResult<AdminDashboardData>> {
  return runAdminQuery(emptyDashboardData, async ({ supabase }) => {
    const since30d = daysAgo(30);

    const recentOrdersPromise = supabase
      .from("orders")
      .select("id, order_reference, status, total_cents, currency, created_at")
      .order("created_at", { ascending: false })
      .limit(8);

    const orders30dPromise = supabase
      .from("orders")
      .select(
        `
          id,
          order_reference,
          status,
          total_cents,
          currency,
          created_at,
          items:order_items(quantity, line_total_cents, product_snapshot)
        `,
      )
      .gte("created_at", since30d)
      .limit(500);

    const reviewProductsPromise = supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("requires_review", true);

    const failedNotificationsPromise = supabase
      .from("checkout_notifications")
      .select("id", { count: "exact", head: true })
      .eq("status", "failed");

    const [recentOrdersResult, orders30dResult, reviewProductsResult, failedNotificationsResult] =
      await Promise.all([
        recentOrdersPromise,
        orders30dPromise,
        reviewProductsPromise,
        failedNotificationsPromise,
      ]);

    if (recentOrdersResult.error) {
      throw recentOrdersResult.error;
    }

    if (orders30dResult.error) {
      throw orders30dResult.error;
    }

    if (reviewProductsResult.error) {
      throw reviewProductsResult.error;
    }

    if (failedNotificationsResult.error) {
      throw failedNotificationsResult.error;
    }

    const orders30d = (orders30dResult.data ?? []) as OrderMetricRow[];
    const orderItems30d = orders30d
      .filter((order) => order.status !== "cancelled")
      .flatMap((order) => order.items ?? []);
    const statusCounts = orders30d.reduce<Record<string, number>>((acc, order) => {
      acc[order.status] = (acc[order.status] ?? 0) + 1;
      return acc;
    }, {});
    const revenue30dCents = orders30d.reduce((sum, order) => sum + order.total_cents, 0);
    const productMap = new Map<string, { title: string; quantity: number; revenueCents: number }>();

    for (const item of orderItems30d) {
      const title = productTitle(item.product_snapshot);
      const current = productMap.get(title) ?? { title, quantity: 0, revenueCents: 0 };
      current.quantity += item.quantity;
      current.revenueCents += item.line_total_cents;
      productMap.set(title, current);
    }

    return {
      metrics: {
        newOrders: statusCounts.new ?? 0,
        orders30d: orders30d.length,
        revenue30dCents,
        completedRevenue30dCents: orders30d
          .filter((order) => order.status === "completed")
          .reduce((sum, order) => sum + order.total_cents, 0),
        averageOrderCents: orders30d.length > 0 ? Math.round(revenue30dCents / orders30d.length) : 0,
        itemsSold30d: orderItems30d.reduce((sum, item) => sum + item.quantity, 0),
        productsNeedReview: reviewProductsResult.count ?? 0,
        failedNotifications: failedNotificationsResult.count ?? 0,
      },
      recentOrders: (recentOrdersResult.data ?? []) as OrderMetricRow[],
      orderStatusCounts: statusCounts,
      topProducts30d: Array.from(productMap.values())
        .sort((left, right) => right.revenueCents - left.revenueCents)
        .slice(0, 8),
    };
  }, adminReadRoles);
}
