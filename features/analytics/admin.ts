import "server-only";

import { adminReadRoles } from "@/features/admin/access";
import { runAdminQuery, type AdminQueryResult } from "@/features/admin/safe-query";

export type AdminDashboardData = {
  metrics: {
    newOrders: number;
    orders30d: number;
    revenue30dCents: number;
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
};

const emptyDashboardData: AdminDashboardData = {
  metrics: {
    newOrders: 0,
    orders30d: 0,
    revenue30dCents: 0,
    productsNeedReview: 0,
    failedNotifications: 0,
  },
  recentOrders: [],
  orderStatusCounts: {},
};

type OrderMetricRow = {
  id: string;
  order_reference: string;
  status: string;
  total_cents: number;
  currency: string;
  created_at: string;
};

function daysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
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
      .select("id, order_reference, status, total_cents, currency, created_at")
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
    const statusCounts = orders30d.reduce<Record<string, number>>((acc, order) => {
      acc[order.status] = (acc[order.status] ?? 0) + 1;
      return acc;
    }, {});

    return {
      metrics: {
        newOrders: statusCounts.new ?? 0,
        orders30d: orders30d.length,
        revenue30dCents: orders30d.reduce((sum, order) => sum + order.total_cents, 0),
        productsNeedReview: reviewProductsResult.count ?? 0,
        failedNotifications: failedNotificationsResult.count ?? 0,
      },
      recentOrders: (recentOrdersResult.data ?? []) as OrderMetricRow[],
      orderStatusCounts: statusCounts,
    };
  }, adminReadRoles);
}
