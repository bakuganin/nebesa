import { redirect } from "next/navigation";

import { AdminAccessNotice } from "@/components/admin/access-notice";
import { LoginForm } from "@/components/admin/login-form";
import { AdminPageHeader } from "@/components/admin/page-header";
import { getAdminAccess, getMissingAdminEnv } from "@/features/admin/access";

function safeAdminRedirect(next: string | string[] | undefined): string {
  const value = Array.isArray(next) ? next[0] : next;

  if (value?.startsWith("/admin") && !value.startsWith("/admin/login")) {
    return value;
  }

  return "/admin";
}

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams?: {
    next?: string | string[];
  };
}) {
  const access = await getAdminAccess();
  const enabled = getMissingAdminEnv().length === 0;

  if (access.status === "ready") {
    redirect(safeAdminRedirect(searchParams?.next));
  }

  return (
    <>
      <AdminPageHeader
        title="Вход в админ-панель"
        description="Используйте Supabase email/password аккаунт с активным профилем администратора."
      />
      {access.status !== "unauthenticated" ? (
        <AdminAccessNotice access={access} />
      ) : null}
      <LoginForm enabled={enabled} />
    </>
  );
}
