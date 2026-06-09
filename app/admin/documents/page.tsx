import Link from "next/link";

import { AdminAccessNotice } from "@/components/admin/access-notice";
import { DataTable, type DataTableColumn } from "@/components/admin/data-table";
import { AdminPageHeader } from "@/components/admin/page-header";
import { formatDateTime } from "@/features/admin/format";
import { getAdminDocumentsPageData, type GeneratedDocumentRow } from "@/features/documents/admin";

const documentColumns: DataTableColumn<GeneratedDocumentRow>[] = [
  {
    header: "Файл",
    cell: (document) => (
      <div>
        <div className="font-medium">{document.storage_path}</div>
        <div className="mt-1 text-xs text-[#6b7671]">{document.storage_bucket}</div>
      </div>
    ),
  },
  {
    header: "Заказ",
    cell: (document) => document.order_id ?? "Без заказа",
  },
  {
    header: "Создан",
    cell: (document) => formatDateTime(document.created_at),
  },
];

export default async function AdminDocumentsPage() {
  const { access, data } = await getAdminDocumentsPageData();

  return (
    <>
      <AdminPageHeader
        title="Документы"
        description="Сгенерированные файлы и связь с заказами."
        actions={
          <Link href="/admin/documents/templates" className="rounded-md bg-[#1f2528] px-4 py-2 text-sm font-medium text-white">
            Шаблоны
          </Link>
        }
      />
      <AdminAccessNotice access={access} />
      <DataTable
        columns={documentColumns}
        rows={data.documents}
        getRowKey={(document) => document.id}
        emptyTitle="Документов пока нет"
        emptyDescription="Сгенерированные PDF/DOCX появятся после обработки заказов."
      />
    </>
  );
}
