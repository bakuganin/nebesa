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

function normalizePage(value: string | string[] | undefined): number {
  const page = Number(Array.isArray(value) ? value[0] : value);
  return Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
}

function snapshotValue(snapshot: Record<string, unknown> | null | undefined, key: string): string | null {
  const value = snapshot?.[key];
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function isRequestOnlyTotal(order: AdminOrderListItem): boolean {
  return order.total_cents === 0 && Boolean(order.items?.some((item) => snapshotValue(item.product_snapshot, "order_mode") === "inquiry_only"));
}

function formatOrderTotal(order: AdminOrderListItem): string {
  return isRequestOnlyTotal(order) ? "По запросу" : formatMoney(order.total_cents, order.currency);
}

function ordersHref(status: AdminOrderStatus | undefined, page: number): string {
  const params = new URLSearchParams();

  if (status) {
    params.set("status", status);
  }

  if (page > 1) {
    params.set("page", String(page));
  }

  const query = params.toString();
  return query ? `/admin/orders?${query}` : "/admin/orders";
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
    cell: (order) => formatOrderTotal(order),
  },
  {
    header: "Создан",
    cell: (order) => formatDateTime(order.created_at),
  },
];

function filterClassName(active: boolean) {
  return `rounded-md border px-3 py-2 text-sm ${
    active
      ? "border-[#1f2528] bg-[#1f2528] text-white"
      : "border-[#cbd4d0] bg-white text-[#1f2528] hover:border-[#59685e]"
  }`;
}

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: { status?: string | string[]; page?: string | string[] };
}) {
  const status = normalizeStatus(searchParams.status);
  const page = normalizePage(searchParams.page);
  const { access, data } = await getAdminOrdersPageData(status, page);
  const pageCount = Math.max(1, Math.ceil(data.count / data.limit));
  const hasPrevious = data.page > 1;
  const hasNext = data.page < pageCount;

  return (
    <>
      <AdminPageHeader title="Заказы" description="Новые checkout-заявки и их операционный статус." />
      <AdminAccessNotice access={access} />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/orders" className={filterClassName(!status)} aria-current={!status ? "page" : undefined}>
            Все
          </Link>
          {allowedStatuses.map((item) => (
            <Link
              key={item}
              href={`/admin/orders?status=${item}`}
              className={filterClassName(status === item)}
              aria-current={status === item ? "page" : undefined}
            >
              {orderStatusLabels[item]}
            </Link>
          ))}
        </div>
        <div className="text-sm text-[#6b7671]">Найдено: {data.count}</div>
      </div>
      <DataTable
        columns={orderColumns}
        rows={data.orders}
        getRowKey={(order) => order.id}
        emptyTitle="Заказов нет"
        emptyDescription="Заявки появятся здесь после оформления checkout."
      />
      {pageCount > 1 ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
          <div className="text-[#6b7671]">
            Страница {data.page} из {pageCount}
          </div>
          <div className="flex gap-2">
            {hasPrevious ? (
              <Link
                href={ordersHref(status, data.page - 1)}
                className="rounded-md border border-[#cbd4d0] bg-white px-3 py-2 text-[#1f2528] hover:border-[#59685e]"
              >
                Назад
              </Link>
            ) : (
              <span className="rounded-md border border-[#e2e8e5] bg-[#f3f6f4] px-3 py-2 text-[#9aa39f]">Назад</span>
            )}
            {hasNext ? (
              <Link
                href={ordersHref(status, data.page + 1)}
                className="rounded-md border border-[#cbd4d0] bg-white px-3 py-2 text-[#1f2528] hover:border-[#59685e]"
              >
                Вперёд
              </Link>
            ) : (
              <span className="rounded-md border border-[#e2e8e5] bg-[#f3f6f4] px-3 py-2 text-[#9aa39f]">Вперёд</span>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
