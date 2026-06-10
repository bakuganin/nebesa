import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

const serverOnlyEnvNames = [
  "DATABASE_URL",
  "SUPABASE_DB_PASSWORD",
  "SUPABASE_SERVICE_ROLE_KEY",
  "RESEND_API_KEY",
  "ORDER_EMAIL_FROM",
  "ORDER_EMAIL_TO",
  "WA_PHONE_NUMBER_ID",
  "WA_BUSINESS_ACCOUNT_ID",
  "WA_ACCESS_TOKEN",
  "WA_TRUSTED_PHONE",
  "WA_VERIFY_TOKEN",
  "WA_APP_SECRET",
];

describe("public environment isolation", () => {
  test("browser Supabase client imports only public environment helpers", () => {
    const browserClientSource = readFileSync("lib/supabase/browser.ts", "utf8");

    expect(browserClientSource).not.toContain("../env");
    expect(browserClientSource).toContain("../public-env");
  });

  test("client-facing public env helper does not mention server-only variable names", () => {
    const publicEnvSource = readFileSync("lib/public-env.ts", "utf8");

    for (const envName of serverOnlyEnvNames) {
      expect(publicEnvSource).not.toContain(envName);
    }
  });

  test("client-facing public env helper uses statically inlined Next public env keys", () => {
    const publicEnvSource = readFileSync("lib/public-env.ts", "utf8");

    expect(publicEnvSource).toContain("process.env.NEXT_PUBLIC_SUPABASE_URL");
    expect(publicEnvSource).toContain("process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY");
    expect(publicEnvSource).toContain("process.env.NEXT_PUBLIC_SITE_URL");
  });
});
