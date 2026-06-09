import { AdminAccessNotice } from "@/components/admin/access-notice";
import { LoginForm } from "@/components/admin/login-form";
import { AdminPageHeader } from "@/components/admin/page-header";
import { getAdminAccess, getMissingAdminEnv } from "@/features/admin/access";

export default async function AdminLoginPage() {
  const access = await getAdminAccess();
  const enabled = getMissingAdminEnv().length === 0;

  return (
    <>
      <AdminPageHeader
        title="Вход в админ-панель"
        description="Используйте Supabase email/password аккаунт с активным профилем администратора."
      />
      {access.status === "ready" ? (
        <div className="mb-5 rounded-md border border-[#bed5c8] bg-[#edf7f0] p-4 text-sm text-[#295338]">
          Вы уже вошли. Роль: {access.profile.role}.
        </div>
      ) : (
        <AdminAccessNotice access={access} />
      )}
      <LoginForm enabled={enabled} />
    </>
  );
}
