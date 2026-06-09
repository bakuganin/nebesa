import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, test } from "vitest";

const initialSchemaSql = readFileSync(
  join(process.cwd(), "supabase/migrations/001_initial_schema.sql"),
  "utf8",
);

const catalogTables = [
  "product_categories",
  "products",
  "product_images",
  "product_variants",
  "product_option_groups",
  "product_option_values",
  "product_variant_option_prices",
  "materials",
  "product_materials",
] as const;

const ownerAdminRoleCheck =
  "public.is_active_admin(array['owner', 'admin']::public.admin_role[])";

describe("catalog RLS policies", () => {
  test("operators can read catalog records without broad write/delete permissions", () => {
    for (const table of catalogTables) {
      expect(initialSchemaSql).toMatch(
        new RegExp(
          `create policy "[^"]+" on public\\.${table}\\s+for select to authenticated\\s+using \\(public\\.is_active_admin\\(\\)\\);`,
          "m",
        ),
      );
      expect(initialSchemaSql).toMatch(
        new RegExp(
          `create policy "[^"]+" on public\\.${table}\\s+for all to authenticated\\s+using \\(${ownerAdminRoleCheck.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\)\\s+with check \\(${ownerAdminRoleCheck.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\);`,
          "m",
        ),
      );
      expect(initialSchemaSql).not.toMatch(
        new RegExp(
          `create policy "[^"]+" on public\\.${table}\\s+for all to authenticated\\s+using \\(public\\.is_active_admin\\(\\)\\)`,
          "m",
        ),
      );
    }
  });
});
