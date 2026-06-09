import "server-only";

import { createClient } from "@supabase/supabase-js";

import { getServerEnv } from "../env";
import { createServerSupabaseClient } from "./server";

export type AdminRole = "owner" | "admin" | "operator";

export type AdminProfile = {
  user_id: string;
  role: AdminRole;
  is_active: boolean;
};

const allAdminRoles: AdminRole[] = ["owner", "admin", "operator"];

function createServiceRoleClient() {
  const env = getServerEnv();

  return createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}

export async function requireAdminRole(
  allowedRoles: readonly AdminRole[] = allAdminRoles,
): Promise<AdminProfile> {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("Authentication is required");
  }

  const { data, error } = await supabase
    .from("admin_profiles")
    .select("user_id, role, is_active")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single();

  if (error || !data) {
    throw new Error("Active admin profile is required");
  }

  const profile = data as AdminProfile;

  if (!allowedRoles.includes(profile.role)) {
    throw new Error("Admin role is not allowed for this operation");
  }

  return profile;
}

export async function createAuthorizedAdminClient(
  allowedRoles: readonly AdminRole[] = allAdminRoles,
) {
  const profile = await requireAdminRole(allowedRoles);

  return {
    supabase: createServiceRoleClient(),
    profile,
  };
}

export async function callCheckoutOrderRpc(payload: unknown) {
  const { data, error } = await createServiceRoleClient().rpc("create_checkout_order", {
    p_payload: payload,
  });

  if (error) {
    throw error;
  }

  return data;
}
