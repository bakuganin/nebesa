import "server-only";

import { adminReadRoles, ownerOnlyRoles } from "./access";
import { runAdminQuery, type AdminQueryResult } from "./safe-query";

export type AdminUserRow = {
  id: string;
  user_id: string;
  role: string;
  full_name: string | null;
  is_active: boolean;
  last_login_at: string | null;
  updated_at: string;
};

export type AuditLogRow = {
  id: string;
  actor_user_id: string | null;
  actor_role: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  created_at: string;
};

export type AdminUsersPageData = {
  users: AdminUserRow[];
};

export type AuditLogPageData = {
  logs: AuditLogRow[];
};

const emptyUsersPageData: AdminUsersPageData = {
  users: [],
};

const emptyAuditLogPageData: AuditLogPageData = {
  logs: [],
};

export async function getAdminUsersPageData(): Promise<AdminQueryResult<AdminUsersPageData>> {
  return runAdminQuery(emptyUsersPageData, async ({ supabase }) => {
    const { data, error } = await supabase
      .from("admin_profiles")
      .select("id, user_id, role, full_name, is_active, last_login_at, updated_at")
      .order("updated_at", { ascending: false });

    if (error) {
      throw error;
    }

    return {
      users: (data ?? []) as AdminUserRow[],
    };
  }, ownerOnlyRoles);
}

export async function getAuditLogPageData(): Promise<AdminQueryResult<AuditLogPageData>> {
  return runAdminQuery(emptyAuditLogPageData, async ({ supabase }) => {
    const { data, error } = await supabase
      .from("audit_logs")
      .select("id, actor_user_id, actor_role, action, entity_type, entity_id, created_at")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      throw error;
    }

    return {
      logs: (data ?? []) as AuditLogRow[],
    };
  }, adminReadRoles);
}
