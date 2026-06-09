import { AdminAccessNotice } from "@/components/admin/access-notice";
import { DataTable, type DataTableColumn } from "@/components/admin/data-table";
import { AdminPageHeader } from "@/components/admin/page-header";
import { StatusBadge } from "@/components/admin/status-badge";
import { formatDateTime } from "@/features/admin/format";
import { getAdminUsersPageData, type AdminUserRow } from "@/features/admin/users";

const userColumns: DataTableColumn<AdminUserRow>[] = [
  {
    header: "Пользователь",
    cell: (user) => (
      <div>
        <div className="font-medium">{user.full_name ?? user.user_id}</div>
        <div className="mt-1 text-xs text-[#6b7671]">{user.user_id}</div>
      </div>
    ),
  },
  {
    header: "Роль",
    cell: (user) => user.role,
  },
  {
    header: "Состояние",
    cell: (user) => <StatusBadge label={user.is_active ? "Активен" : "Отключен"} tone={user.is_active ? "success" : "danger"} />,
  },
  {
    header: "Последний вход",
    cell: (user) => formatDateTime(user.last_login_at),
  },
];

export default async function AdminUsersPage() {
  const { access, data } = await getAdminUsersPageData();

  return (
    <>
      <AdminPageHeader
        title="Пользователи"
        description="Список admin-профилей. Изменения ролей доступны только owner-аккаунту и дополнительно защищены RLS."
      />
      <AdminAccessNotice access={access} />
      <DataTable
        columns={userColumns}
        rows={data.users}
        getRowKey={(user) => user.id}
        emptyTitle="Администраторы не найдены"
        emptyDescription="Первый owner создается через bootstrap после подключения Supabase."
      />
    </>
  );
}
