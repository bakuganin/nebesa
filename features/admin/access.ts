import "server-only";

import { requireAdminRole, type AdminProfile, type AdminRole } from "@/lib/supabase/admin";

export const adminReadRoles: AdminRole[] = ["owner", "admin", "operator"];
export const adminWriteRoles: AdminRole[] = ["owner", "admin"];
export const ownerOnlyRoles: AdminRole[] = ["owner"];

const requiredAdminEnvKeys = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_SITE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
] as const;

export type AdminAccessState =
  | {
      status: "ready";
      profile: AdminProfile;
    }
  | {
      status: "not_configured";
      missing: string[];
      message: string;
    }
  | {
      status: "unauthenticated";
      message: string;
    }
  | {
      status: "forbidden";
      message: string;
    }
  | {
      status: "error";
      message: string;
    };

function envValue(key: string): string | undefined {
  const value = process.env[key];
  return value && value.trim().length > 0 ? value : undefined;
}

export function getMissingAdminEnv(): string[] {
  return requiredAdminEnvKeys.filter((key) => !envValue(key));
}

function classifyAccessError(error: unknown): AdminAccessState {
  const message = error instanceof Error ? error.message : "Не удалось проверить доступ.";

  if (message.includes("Authentication is required")) {
    return {
      status: "unauthenticated",
      message: "Войдите в аккаунт администратора, чтобы открыть панель.",
    };
  }

  if (
    message.includes("Active admin profile is required") ||
    message.includes("Admin role is not allowed")
  ) {
    return {
      status: "forbidden",
      message: "У текущего аккаунта нет активной роли для этого раздела.",
    };
  }

  return {
    status: "error",
    message: "Не удалось проверить доступ к админ-панели. Проверьте конфигурацию и повторите попытку.",
  };
}

export async function getAdminAccess(
  allowedRoles: readonly AdminRole[] = adminReadRoles,
): Promise<AdminAccessState> {
  const missing = getMissingAdminEnv();

  if (missing.length > 0) {
    return {
      status: "not_configured",
      missing,
      message: "Админ-панель ожидает Supabase env-переменные. Страницы работают в режиме каркаса.",
    };
  }

  try {
    const profile = await requireAdminRole(allowedRoles);
    return {
      status: "ready",
      profile,
    };
  } catch (error) {
    return classifyAccessError(error);
  }
}

export function isAdminReady(access: AdminAccessState): access is Extract<AdminAccessState, { status: "ready" }> {
  return access.status === "ready";
}

export function hasAdminRole(
  access: AdminAccessState,
  allowedRoles: readonly AdminRole[],
): access is Extract<AdminAccessState, { status: "ready" }> {
  return isAdminReady(access) && allowedRoles.includes(access.profile.role);
}

export function canAdminWrite(access: AdminAccessState): boolean {
  return hasAdminRole(access, adminWriteRoles);
}
