import type { Metadata } from "next";
import type { ReactNode } from "react";

import { AdminShell } from "@/components/admin/admin-shell";
import { getAdminAccess } from "@/features/admin/access";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Админ-панель | NEBESA",
  description: "Операционная панель NEBESA",
};

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const access = await getAdminAccess();

  return <AdminShell access={access}>{children}</AdminShell>;
}
