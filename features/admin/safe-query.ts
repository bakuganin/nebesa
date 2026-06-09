import "server-only";

import { createAuthorizedAdminClient, type AdminRole } from "@/lib/supabase/admin";

import { adminReadRoles, getAdminAccess, type AdminAccessState } from "./access";

type AuthorizedAdminClient = Awaited<ReturnType<typeof createAuthorizedAdminClient>>;

export type AdminQueryResult<T> = {
  access: AdminAccessState;
  data: T;
  error?: string;
};

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Не удалось загрузить данные.";
}

export async function runAdminQuery<T>(
  fallback: T,
  loader: (client: AuthorizedAdminClient) => Promise<T>,
  allowedRoles: readonly AdminRole[] = adminReadRoles,
): Promise<AdminQueryResult<T>> {
  const access = await getAdminAccess(allowedRoles);

  if (access.status !== "ready") {
    return {
      access,
      data: fallback,
    };
  }

  try {
    const client = await createAuthorizedAdminClient(allowedRoles);
    return {
      access,
      data: await loader(client),
    };
  } catch (error) {
    return {
      access: {
        status: "error",
        message: errorMessage(error),
      },
      data: fallback,
      error: errorMessage(error),
    };
  }
}
