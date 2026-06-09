import Link from "next/link";

import { AdminAccessNotice } from "@/components/admin/access-notice";
import { DataTable, type DataTableColumn } from "@/components/admin/data-table";
import { AdminPageHeader } from "@/components/admin/page-header";
import { StatusBadge } from "@/components/admin/status-badge";
import { formatDateTime, formatMoney, notificationStatusLabels, orderStatusLabels } from "@/features/admin/format";
import { getAdminOrdersPageData, type AdminOrderListItem, type AdminOrderStatus } from "@/features/admin/orders";

const allowedStatuses: AdminOrderStatus[] = ["new", "confirmed", "in_progress", "completed", "cancelled"];

function normalizeStatus(value: string | string[] | undefined): AdminOrderStatus | undefined {
  const status = Array.isArray(value) ? value[0] : value;
  return allowedStatuses.includes(status as AdminOrderStatus) ? (status as AdminOrderStatus) : undefined;
}

const orderColumns: DataTableColumn<AdminOrderListItem>[] = [
  {
    header: "Заказ",
    cell: (order) => (
      <Link href={`/admin/orders/${order.id}`} className="font-medium underline-offset-4 hover:underline">
        {order.order_reference}
      </Link>
    ),
  },
  {
    header: "Клиент",
    cell: (order) => (
      <div>
        <div className="font-medium">{order.customer?.full_name ?? "Без клиента"}</div>
        <div className="mt-1 text-xs text-[#6b7671]">{order.customer?.phone ?? "Телефон не указан"}</div>
      </div>
    ),
  },
  {
    header: "Статус",
    cell: (order) => <StatusBadge label={orderStatusLabels[order.status] ?? order.status} tone={order.status === "new" ? "warning" : "neutral"} />,
  },
  {
    header: "Уведомление",
    cell: (order) => notificationStatusLabels[order.notification_status] ?? order.notification_status,
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

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: { status?: string | string[] };
}) {
  const status = normalizeStatus(searchParams.status);
  const { access, data } = await getAdminOrdersPageData(status);

  return (
    <>
      <AdminPageHeader title="Заказы" description="Новые checkout-заявки и их операционный статус." />
      <AdminAccessNotice access={access} />
      <div className="mb-4 flex flex-wrap gap-2">
        <Link href="/admin/orders" className="rounded-md border border-[#cbd4d0] bg-white px-3 py-2 text-sm">
          Все
        </Link>
        {allowedStatuses.map((item) => (
          <Link
            key={item}
            href={`/admin/orders?status=${item}`}
            className="rounded-md border border-[#cbd4d0] bg-white px-3 py-2 text-sm"
          >
            {orderStatusLabels[item]}
          </Link>
        ))}
      </div>
      <DataTable
        columns={orderColumns}
        rows={data.orders}
        getRowKey={(order) => order.id}
        emptyTitle="Заказов нет"
        emptyDescription="Заявки появятся здесь после оформления checkout."
      />
    </>
  );
}
