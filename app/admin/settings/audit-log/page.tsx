import { AdminAccessNotice } from "@/components/admin/access-notice";
import { DataTable, type DataTableColumn } from "@/components/admin/data-table";
import { AdminPageHeader } from "@/components/admin/page-header";
import { formatDateTime } from "@/features/admin/format";
import { getAuditLogPageData, type AuditLogRow } from "@/features/admin/users";

const auditColumns: DataTableColumn<AuditLogRow>[] = [
  {
    header: "Действие",
    cell: (log) => (
      <div>
        <div className="font-medium">{log.action}</div>
        <div className="mt-1 text-xs text-[#6b7671]">
          {log.entity_type}
          {log.entity_id ? `: ${log.entity_id}` : ""}
        </div>
      </div>
    ),
  },
  {
    header: "Актор",
    cell: (log) => log.actor_role ?? "system",
  },
  {
    header: "Создано",
    cell: (log) => formatDateTime(log.created_at),
  },
];

export default async function AdminAuditLogPage() {
  const { access, data } = await getAuditLogPageData();

  return (
    <>
      <AdminPageHeader title="Журнал аудита" description="Последние административные события и системные записи." />
      <AdminAccessNotice access={access} />
      <DataTable
        columns={auditColumns}
        rows={data.logs}
        getRowKey={(log) => log.id}
        emptyTitle="Записей аудита нет"
        emptyDescription="События появятся после административных действий."
      />
    </>
  );
}
