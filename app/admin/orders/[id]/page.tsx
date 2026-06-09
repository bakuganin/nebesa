import { AdminAccessNotice } from "@/components/admin/access-notice";
import { DataTable, type DataTableColumn } from "@/components/admin/data-table";
import { EmptyState } from "@/components/admin/empty-state";
import { FormField, inputClassName } from "@/components/admin/form-field";
import { AdminPageHeader } from "@/components/admin/page-header";
import { StatusBadge } from "@/components/admin/status-badge";
import { updateOrderStatusAction } from "@/features/admin/actions";
import { canAdminWrite } from "@/features/admin/access";
import { formatDateTime, formatMoney, notificationStatusLabels, orderStatusLabels } from "@/features/admin/format";
import {
  getAdminOrderDetailPageData,
  snapshotTitle,
  type AdminOrderItem,
} from "@/features/admin/orders";

const itemColumns: DataTableColumn<AdminOrderItem>[] = [
  {
    header: "Позиция",
    cell: (item) => (
      <div>
        <div className="font-medium">{snapshotTitle(item.product_snapshot)}</div>
        {item.variant_snapshot ? <div className="mt-1 text-xs text-[#6b7671]">{snapshotTitle(item.variant_snapshot)}</div> : null}
      </div>
    ),
  },
  {
    header: "Количество",
    cell: (item) => item.quantity,
  },
  {
    header: "Цена",
    cell: (item) => formatMoney(item.unit_price_cents, item.currency),
  },
  {
    header: "Итого",
    cell: (item) => formatMoney(item.line_total_cents, item.currency),
  },
];

export default async function AdminOrderDetailPage({ params }: { params: { id: string } }) {
  const { access, data } = await getAdminOrderDetailPageData(params.id);
  const order = data.order;
  const action = updateOrderStatusAction.bind(null, params.id);
  const canWrite = canAdminWrite(access);

  return (
    <>
      <AdminPageHeader title="Заказ" description={order ? order.order_reference : "Карточка заказа"} />
      <AdminAccessNotice access={access} />
      {order ? (
        <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
          <div className="grid gap-6">
            <div className="rounded-md border border-[#d8dedc] bg-white p-5">
              <div className="flex flex-wrap items-center gap-3">
                <StatusBadge label={orderStatusLabels[order.status] ?? order.status} tone={order.status === "new" ? "warning" : "neutral"} />
                <span className="text-sm text-[#59685e]">
                  Уведомление: {notificationStatusLabels[order.notification_status] ?? order.notification_status}
                </span>
              </div>
              <dl className="mt-5 grid gap-4 text-sm md:grid-cols-2">
                <div>
                  <dt className="text-[#59685e]">Клиент</dt>
                  <dd className="mt-1 font-medium">{order.customer?.full_name ?? "Не указан"}</dd>
                </div>
                <div>
                  <dt className="text-[#59685e]">Телефон</dt>
                  <dd className="mt-1 font-medium">{order.customer?.phone ?? "Не указан"}</dd>
                </div>
                <div>
                  <dt className="text-[#59685e]">Email</dt>
                  <dd className="mt-1 font-medium">{order.customer?.email ?? "Не указан"}</dd>
                </div>
                <div>
                  <dt className="text-[#59685e]">Создан</dt>
                  <dd className="mt-1 font-medium">{formatDateTime(order.created_at)}</dd>
                </div>
                <div className="md:col-span-2">
                  <dt className="text-[#59685e]">Комментарий клиента</dt>
                  <dd className="mt-1">{order.customer_note ?? "Нет комментария"}</dd>
                </div>
              </dl>
            </div>
            <DataTable
              columns={itemColumns}
              rows={order.items}
              getRowKey={(item) => item.id}
              emptyTitle="В заказе нет позиций"
            />
          </div>
          <aside className="grid h-fit gap-5">
            <div className="rounded-md border border-[#d8dedc] bg-white p-5">
              <div className="text-sm text-[#59685e]">Сумма заказа</div>
              <div className="mt-2 text-2xl font-semibold">{formatMoney(order.total_cents, order.currency)}</div>
            </div>
            <form action={canWrite ? action : undefined} className="grid gap-4 rounded-md border border-[#d8dedc] bg-white p-5">
              <fieldset disabled={!canWrite} className="grid gap-4">
                <FormField label="Статус" htmlFor="order-status">
                  <select id="order-status" name="status" defaultValue={order.status} className={inputClassName}>
                    <option value="new">Новый</option>
                    <option value="confirmed">Подтвержден</option>
                    <option value="in_progress">В работе</option>
                    <option value="completed">Завершен</option>
                    <option value="cancelled">Отменен</option>
                  </select>
                </FormField>
                <FormField label="Внутренняя заметка" htmlFor="order-note">
                  <textarea id="order-note" name="note" rows={4} defaultValue={order.internal_note ?? ""} className={inputClassName} />
                </FormField>
              </fieldset>
              <button
                type="submit"
                disabled={!canWrite}
                className="min-h-10 rounded-md bg-[#1f2528] px-4 py-2 text-sm font-medium text-white outline-none focus-visible:ring-2 focus-visible:ring-[#59685e]/30 disabled:bg-[#9aa39f]"
              >
                Обновить статус
              </button>
            </form>
          </aside>
        </div>
      ) : (
        <EmptyState title="Заказ не найден" description="Проверьте ссылку или откройте список заказов." />
      )}
    </>
  );
}
