import Link from "next/link";

import { AdminAccessNotice } from "@/components/admin/access-notice";
import { DataTable, type DataTableColumn } from "@/components/admin/data-table";
import { EmptyState } from "@/components/admin/empty-state";
import { FormField, inputClassName } from "@/components/admin/form-field";
import { AdminPageHeader } from "@/components/admin/page-header";
import { StatusBadge } from "@/components/admin/status-badge";
import { updateOrderStatusAction } from "@/features/admin/actions";
import { canAdminWrite } from "@/features/admin/access";
import { formatDateTime, formatMoney, notificationStatusLabels, orderStatusLabels } from "@/features/admin/format";
import { generateOrderDocumentAction } from "@/features/documents/actions";
import {
  getAdminOrderDetailPageData,
  snapshotTitle,
  type AdminOrderItem,
} from "@/features/admin/orders";

function snapshotValue(snapshot: Record<string, unknown> | null | undefined, key: string): string | null {
  const value = snapshot?.[key];
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function isRequestItem(item: AdminOrderItem): boolean {
  return snapshotValue(item.product_snapshot, "order_mode") === "inquiry_only" && item.line_total_cents === 0;
}

function formatOrderItemMoney(item: AdminOrderItem, cents: number): string {
  return isRequestItem(item) ? "По запросу" : formatMoney(cents, item.currency);
}

function formatOrderTotal(order: { total_cents: number; currency: string; items: AdminOrderItem[] }): string {
  return order.total_cents === 0 && order.items.some(isRequestItem)
    ? "По запросу"
    : formatMoney(order.total_cents, order.currency);
}

function optionText(option: NonNullable<AdminOrderItem["options"]>[number]): string {
  return [snapshotTitle(option.option_group_snapshot), snapshotTitle(option.option_value_snapshot)].join(": ");
}

function notificationFallbackUrl(payload: Record<string, unknown> | null): string | null {
  const value = payload?.fallbackUrl;
  return typeof value === "string" && value.length > 0 ? value : null;
}

const itemColumns: DataTableColumn<AdminOrderItem>[] = [
  {
    header: "Позиция",
    cell: (item) => (
      <div>
        <div className="font-medium">{snapshotTitle(item.product_snapshot)}</div>
        {item.variant_snapshot ? <div className="mt-1 text-xs text-[#6b7671]">{snapshotTitle(item.variant_snapshot)}</div> : null}
        {item.material_snapshot ? <div className="mt-1 text-xs text-[#6b7671]">Материал: {snapshotTitle(item.material_snapshot)}</div> : null}
        {item.options?.length ? (
          <ul className="mt-2 grid gap-1 text-xs text-[#6b7671]">
            {item.options.map((option) => (
              <li key={`${snapshotTitle(option.option_group_snapshot)}-${snapshotTitle(option.option_value_snapshot)}`}>
                {optionText(option)}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    ),
  },
  {
    header: "Количество",
    cell: (item) => item.quantity,
  },
  {
    header: "Цена",
    cell: (item) => formatOrderItemMoney(item, item.unit_price_cents),
  },
  {
    header: "Итого",
    cell: (item) => formatOrderItemMoney(item, item.line_total_cents),
  },
];

export default async function AdminOrderDetailPage({ params }: { params: { id: string } }) {
  const { access, data } = await getAdminOrderDetailPageData(params.id);
  const order = data.order;
  const action = updateOrderStatusAction.bind(null, params.id);
  const documentAction = generateOrderDocumentAction.bind(null, params.id);
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
                  <dt className="text-[#59685e]">Адрес или место церемонии</dt>
                  <dd className="mt-1 font-medium">{order.customer?.address ?? "Не указан"}</dd>
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
            <div className="rounded-md border border-[#d8dedc] bg-white p-5">
              <h2 className="text-base font-semibold text-[#1f2528]">Уведомления</h2>
              {order.notifications.length > 0 ? (
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {order.notifications.map((notification) => {
                    const fallbackUrl = notificationFallbackUrl(notification.payload);

                    return (
                      <div key={notification.id} className="rounded-md border border-[#edf1ef] p-4 text-sm">
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-medium uppercase tracking-[0.12em] text-[#1f2528]">
                            {notification.channel}
                          </span>
                          <StatusBadge
                            label={notificationStatusLabels[notification.status] ?? notification.status}
                            tone={notification.status === "failed" ? "warning" : "neutral"}
                          />
                        </div>
                        <dl className="mt-3 grid gap-2 text-xs text-[#6b7671]">
                          <div className="flex justify-between gap-3">
                            <dt>Попыток</dt>
                            <dd className="font-medium text-[#1f2528]">{notification.attempt_count}</dd>
                          </div>
                          <div className="flex justify-between gap-3">
                            <dt>Отправлено</dt>
                            <dd className="font-medium text-[#1f2528]">
                              {notification.sent_at ? formatDateTime(notification.sent_at) : "Нет"}
                            </dd>
                          </div>
                          <div className="flex justify-between gap-3">
                            <dt>Обновлено</dt>
                            <dd className="font-medium text-[#1f2528]">{formatDateTime(notification.updated_at)}</dd>
                          </div>
                        </dl>
                        {notification.error_message ? (
                          <p className="mt-3 rounded-md bg-[#f6efe3] p-2 text-xs text-[#705326]">
                            {notification.error_message}
                          </p>
                        ) : null}
                        {fallbackUrl ? (
                          <a
                            href={fallbackUrl}
                            className="mt-3 inline-flex text-xs font-semibold text-[#59685e] underline-offset-4 hover:underline"
                            target="_blank"
                            rel="noreferrer"
                          >
                            Открыть fallback WhatsApp
                          </a>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="mt-2 text-sm text-[#6b7671]">Уведомления по заказу пока не записаны.</p>
              )}
            </div>
          </div>
          <aside className="grid h-fit gap-5">
            <div className="rounded-md border border-[#d8dedc] bg-white p-5">
              <div className="text-sm text-[#59685e]">Сумма заказа</div>
              <div className="mt-2 text-2xl font-semibold">{formatOrderTotal(order)}</div>
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
            <form action={canWrite ? documentAction : undefined} className="grid gap-4 rounded-md border border-[#d8dedc] bg-white p-5">
              <fieldset disabled={!canWrite || data.documentTemplates.length === 0} className="grid gap-4">
                <FormField label="Документ" htmlFor="document-template">
                  <select id="document-template" name="template_id" className={inputClassName} required>
                    <option value="">Выберите шаблон</option>
                    {data.documentTemplates.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.title}
                      </option>
                    ))}
                  </select>
                </FormField>
              </fieldset>
              <button
                type="submit"
                disabled={!canWrite || data.documentTemplates.length === 0}
                className="min-h-10 rounded-md bg-[#1f2528] px-4 py-2 text-sm font-medium text-white outline-none focus-visible:ring-2 focus-visible:ring-[#59685e]/30 disabled:bg-[#9aa39f]"
              >
                Сгенерировать DOCX
              </button>
              {data.documentTemplates.length === 0 ? (
                <p className="text-sm text-[#6b7671]">Сначала создайте активный шаблон в разделе документов.</p>
              ) : null}
            </form>
            <div className="rounded-md border border-[#d8dedc] bg-white p-5">
              <h2 className="text-base font-semibold text-[#1f2528]">Вложения</h2>
              {data.generatedDocuments.length > 0 ? (
                <ul className="mt-4 grid gap-3">
                  {data.generatedDocuments.map((document) => (
                    <li key={document.id} className="grid gap-1 rounded-md border border-[#edf1ef] p-3 text-sm">
                      <Link
                        href={`/admin/documents/${document.id}/download`}
                        className="break-all font-medium text-[#1f2528] underline-offset-4 hover:underline"
                      >
                        {document.storage_path}
                      </Link>
                      <span className="text-xs text-[#6b7671]">{formatDateTime(document.created_at)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-[#6b7671]">Документы для заказа пока не созданы.</p>
              )}
            </div>
          </aside>
        </div>
      ) : (
        <EmptyState title="Заказ не найден" description="Проверьте ссылку или откройте список заказов." />
      )}
    </>
  );
}
