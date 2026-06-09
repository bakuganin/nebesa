import { AdminAccessNotice } from "@/components/admin/access-notice";
import { DataTable, type DataTableColumn } from "@/components/admin/data-table";
import { AdminPageHeader } from "@/components/admin/page-header";
import { StatusBadge } from "@/components/admin/status-badge";
import { TemplateForm } from "@/components/admin/template-form";
import { saveWhatsAppTemplateAction } from "@/features/admin/bot-actions";
import { getAdminBotPageData, type WhatsAppEventRow, type WhatsAppTemplateRow } from "@/features/admin/bot";
import { canAdminWrite } from "@/features/admin/access";
import { formatDateTime } from "@/features/admin/format";

const templateColumns: DataTableColumn<WhatsAppTemplateRow>[] = [
  {
    header: "Шаблон",
    cell: (template) => (
      <div>
        <div className="font-medium">{template.title}</div>
        <div className="mt-1 text-xs text-[#6b7671]">{template.slug}</div>
      </div>
    ),
  },
  {
    header: "Статус",
    cell: (template) => <StatusBadge label={template.is_active ? "Активен" : "Отключен"} tone={template.is_active ? "success" : "neutral"} />,
  },
  {
    header: "Обновлен",
    cell: (template) => formatDateTime(template.updated_at),
  },
];

const eventColumns: DataTableColumn<WhatsAppEventRow>[] = [
  {
    header: "Событие",
    cell: (event) => (
      <div>
        <div className="font-medium">{event.event_type}</div>
        <div className="mt-1 text-xs text-[#6b7671]">{event.direction}</div>
      </div>
    ),
  },
  {
    header: "Телефон",
    cell: (event) => event.phone ?? "Не указан",
  },
  {
    header: "Создано",
    cell: (event) => formatDateTime(event.created_at),
  },
];

export default async function AdminBotPage() {
  const { access, data } = await getAdminBotPageData();
  const canWrite = canAdminWrite(access);

  return (
    <>
      <AdminPageHeader title="WhatsApp бот" description="Шаблоны сообщений и последние webhook-события." />
      <AdminAccessNotice access={access} />
      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <div className="grid gap-6">
          <DataTable
            columns={templateColumns}
            rows={data.templates}
            getRowKey={(template) => template.id}
            emptyTitle="Шаблонов WhatsApp пока нет"
          />
          <DataTable
            columns={eventColumns}
            rows={data.events}
            getRowKey={(event) => event.id}
            emptyTitle="Webhook-событий пока нет"
          />
        </div>
        <TemplateForm action={saveWhatsAppTemplateAction} disabled={!canWrite} submitLabel="Сохранить шаблон" />
      </div>
    </>
  );
}
