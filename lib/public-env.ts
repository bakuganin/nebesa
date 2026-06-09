type EnvMap = Record<string, string | undefined>;

export type PublicEnv = {
  NEXT_PUBLIC_SUPABASE_URL: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
  NEXT_PUBLIC_SITE_URL: string;
};

function readEnv(): EnvMap {
  return typeof process === "undefined" ? {} : process.env;
}

function valueFor(env: EnvMap, key: string): string | undefined {
  const value = env[key];
  return value && value.trim().length > 0 ? value : undefined;
}

export function requirePublicEnvValue(env: EnvMap, key: keyof PublicEnv): string {
  const value = valueFor(env, key);

  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value;
}

export function getPublicEnv(env: EnvMap = readEnv()): PublicEnv {
  return {
    NEXT_PUBLIC_SUPABASE_URL: requirePublicEnvValue(env, "NEXT_PUBLIC_SUPABASE_URL"),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: requirePublicEnvValue(env, "NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    NEXT_PUBLIC_SITE_URL: requirePublicEnvValue(env, "NEXT_PUBLIC_SITE_URL"),
  };
}
