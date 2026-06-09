type EnvMap = Record<string, string | undefined>;

export type PublicEnv = {
  NEXT_PUBLIC_SUPABASE_URL: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
  NEXT_PUBLIC_SITE_URL: string;
};

export type ServerEnv = PublicEnv & {
  DATABASE_URL?: string;
  SUPABASE_DB_PASSWORD?: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  WA_PHONE_NUMBER_ID?: string;
  WA_BUSINESS_ACCOUNT_ID?: string;
  WA_ACCESS_TOKEN?: string;
  WA_TRUSTED_PHONE?: string;
  WA_VERIFY_TOKEN?: string;
  WA_APP_SECRET?: string;
};

const publicKeys = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_SITE_URL",
] as const;

const serverKeys = [
  "DATABASE_URL",
  "SUPABASE_DB_PASSWORD",
  "SUPABASE_SERVICE_ROLE_KEY",
  "WA_PHONE_NUMBER_ID",
  "WA_BUSINESS_ACCOUNT_ID",
  "WA_ACCESS_TOKEN",
  "WA_TRUSTED_PHONE",
  "WA_VERIFY_TOKEN",
  "WA_APP_SECRET",
] as const;

function readEnv(): EnvMap {
  return typeof process === "undefined" ? {} : process.env;
}

function valueFor(env: EnvMap, key: string): string | undefined {
  const value = env[key];
  return value && value.trim().length > 0 ? value : undefined;
}

function requireValue(env: EnvMap, key: string): string {
  const value = valueFor(env, key);

  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value;
}

export function getPublicEnv(env: EnvMap = readEnv()): PublicEnv {
  return {
    NEXT_PUBLIC_SUPABASE_URL: requireValue(env, "NEXT_PUBLIC_SUPABASE_URL"),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: requireValue(env, "NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    NEXT_PUBLIC_SITE_URL: requireValue(env, "NEXT_PUBLIC_SITE_URL"),
  };
}

export function getServerEnv(env: EnvMap = readEnv()): ServerEnv {
  const publicEnv = getPublicEnv(env);

  return {
    ...publicEnv,
    DATABASE_URL: valueFor(env, "DATABASE_URL"),
    SUPABASE_DB_PASSWORD: valueFor(env, "SUPABASE_DB_PASSWORD"),
    SUPABASE_SERVICE_ROLE_KEY: requireValue(env, "SUPABASE_SERVICE_ROLE_KEY"),
    WA_PHONE_NUMBER_ID: valueFor(env, "WA_PHONE_NUMBER_ID"),
    WA_BUSINESS_ACCOUNT_ID: valueFor(env, "WA_BUSINESS_ACCOUNT_ID"),
    WA_ACCESS_TOKEN: valueFor(env, "WA_ACCESS_TOKEN"),
    WA_TRUSTED_PHONE: valueFor(env, "WA_TRUSTED_PHONE"),
    WA_VERIFY_TOKEN: valueFor(env, "WA_VERIFY_TOKEN"),
    WA_APP_SECRET: valueFor(env, "WA_APP_SECRET"),
  };
}

export function assertProductionServerEnv(env: EnvMap = readEnv()): void {
  if (env.NODE_ENV !== "production") {
    return;
  }

  for (const key of [...publicKeys, ...serverKeys]) {
    requireValue(env, key);
  }
}
