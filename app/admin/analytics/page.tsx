import { BarChart3, ClipboardList, Euro, PackageCheck } from "lucide-react";

import { AdminAccessNotice } from "@/components/admin/access-notice";
import { DataTable, type DataTableColumn } from "@/components/admin/data-table";
import { MetricCard } from "@/components/admin/metric-card";
import { AdminPageHeader } from "@/components/admin/page-header";
import { formatCount, formatMoney, orderStatusLabels } from "@/features/admin/format";
import { getAdminDashboardData } from "@/features/analytics/admin";

type StatusRow = {
  status: string;
  count: number;
};

const statusColumns: DataTableColumn<StatusRow>[] = [
  {
    header: "Статус",
    cell: (row) => orderStatusLabels[row.status] ?? row.status,
  },
  {
    header: "Заказов",
    cell: (row) => formatCount(row.count),
  },
];

export default async function AdminAnalyticsPage() {
  const { access, data } = await getAdminDashboardData();
  const statusRows = Object.entries(data.orderStatusCounts).map(([status, count]) => ({ status, count }));

  return (
    <>
      <AdminPageHeader title="Аналитика" description="Минимальные показатели для контроля в MVP." />
      <AdminAccessNotice access={access} />
      <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Заказы 30 дней" value={formatCount(data.metrics.orders30d)} icon={<ClipboardList aria-hidden="true" className="h-5 w-5" />} />
        <MetricCard label="Оборот 30 дней" value={formatMoney(data.metrics.revenue30dCents)} icon={<Euro aria-hidden="true" className="h-5 w-5" />} />
        <MetricCard label="Новые" value={formatCount(data.metrics.newOrders)} icon={<BarChart3 aria-hidden="true" className="h-5 w-5" />} />
        <MetricCard label="На проверке" value={formatCount(data.metrics.productsNeedReview)} icon={<PackageCheck aria-hidden="true" className="h-5 w-5" />} />
      </div>
      <DataTable
        columns={statusColumns}
        rows={statusRows}
        getRowKey={(row) => row.status}
        emptyTitle="Статистики пока нет"
        emptyDescription="Данные появятся после первых заказов."
      />
    </>
  );
}
