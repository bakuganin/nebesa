import { AdminAccessNotice } from "@/components/admin/access-notice";
import { DataTable, type DataTableColumn } from "@/components/admin/data-table";
import { AdminPageHeader } from "@/components/admin/page-header";
import { StatusBadge } from "@/components/admin/status-badge";
import { TemplateForm } from "@/components/admin/template-form";
import { isAdminReady } from "@/features/admin/access";
import { formatDateTime } from "@/features/admin/format";
import { getAdminDocumentTemplatesPageData, type DocumentTemplateRow } from "@/features/documents/admin";
import { saveDocumentTemplateAction } from "@/features/documents/actions";

const templateColumns: DataTableColumn<DocumentTemplateRow>[] = [
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
    header: "Состояние",
    cell: (template) => <StatusBadge label={template.is_active ? "Активен" : "Отключен"} tone={template.is_active ? "success" : "neutral"} />,
  },
  {
    header: "Обновлен",
    cell: (template) => formatDateTime(template.updated_at),
  },
];

export default async function AdminDocumentTemplatesPage() {
  const { access, data } = await getAdminDocumentTemplatesPageData();
  const canWrite = isAdminReady(access);

  return (
    <>
      <AdminPageHeader title="Шаблоны документов" description="Базовые тексты для генерации документов по заказу." />
      <AdminAccessNotice access={access} />
      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <DataTable
          columns={templateColumns}
          rows={data.templates}
          getRowKey={(template) => template.id}
          emptyTitle="Шаблонов пока нет"
          emptyDescription="Добавьте первый шаблон для будущей генерации документов."
        />
        <TemplateForm action={saveDocumentTemplateAction} disabled={!canWrite} submitLabel="Сохранить шаблон" />
      </div>
    </>
  );
}
