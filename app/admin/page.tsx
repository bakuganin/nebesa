import { AlertTriangle, ClipboardList, Euro, PackageCheck } from "lucide-react";
import Link from "next/link";

import { AdminAccessNotice } from "@/components/admin/access-notice";
import { DataTable, type DataTableColumn } from "@/components/admin/data-table";
import { MetricCard } from "@/components/admin/metric-card";
import { AdminPageHeader } from "@/components/admin/page-header";
import { StatusBadge } from "@/components/admin/status-badge";
import { formatCount, formatDateTime, formatMoney, orderStatusLabels } from "@/features/admin/format";
import { getAdminDashboardData, type AdminDashboardData } from "@/features/analytics/admin";

type RecentOrder = AdminDashboardData["recentOrders"][number];

function statusLabel(status: string): string {
  return orderStatusLabels[status] ?? status;
}

const recentOrderColumns: DataTableColumn<RecentOrder>[] = [
  {
    header: "Заказ",
    cell: (order) => (
      <Link href={`/admin/orders/${order.id}`} className="font-medium text-[#1f2528] underline-offset-4 hover:underline">
        {order.order_reference}
      </Link>
    ),
  },
  {
    header: "Статус",
    cell: (order) => <StatusBadge label={statusLabel(order.status)} tone={order.status === "new" ? "warning" : "neutral"} />,
  },
  {
    header: "Сумма",
    cell: (order) => formatMoney(order.total_cents, order.currency),
  },
  {
    header: "Создан",
    cell: (order) => formatDateTime(order.created_at),
  },
];

export default async function AdminDashboardPage() {
  const { access, data } = await getAdminDashboardData();

  return (
    <>
      <AdminPageHeader title="Обзор" description="Ключевые операционные показатели и последние заказы." />
      <AdminAccessNotice access={access} />
      <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Новые заказы"
          value={formatCount(data.metrics.newOrders)}
          hint="За последние 30 дней"
          icon={<ClipboardList aria-hidden="true" className="h-5 w-5" />}
        />
        <MetricCard
          label="Оборот 30 дней"
          value={formatMoney(data.metrics.revenue30dCents)}
          hint={`${formatCount(data.metrics.orders30d)} заказов в периоде`}
          icon={<Euro aria-hidden="true" className="h-5 w-5" />}
        />
        <MetricCard
          label="Требуют проверки"
          value={formatCount(data.metrics.productsNeedReview)}
          hint="Импортированные или новые товары"
          icon={<PackageCheck aria-hidden="true" className="h-5 w-5" />}
        />
        <MetricCard
          label="Ошибки уведомлений"
          value={formatCount(data.metrics.failedNotifications)}
          hint="WhatsApp/checkout notifications"
          icon={<AlertTriangle aria-hidden="true" className="h-5 w-5" />}
        />
      </div>
      <DataTable
        columns={recentOrderColumns}
        rows={data.recentOrders}
        getRowKey={(order) => order.id}
        emptyTitle="Заказов пока нет"
        emptyDescription="После первого checkout здесь появятся последние заявки."
      />
    </>
  );
}
