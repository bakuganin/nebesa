import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, test } from "vitest";

const initialSchemaSql = readFileSync(
  join(process.cwd(), "supabase/migrations/001_initial_schema.sql"),
  "utf8",
);
const migrationsSql = readdirSync(join(process.cwd(), "supabase/migrations"))
  .filter((file) => file.endsWith(".sql"))
  .sort()
  .map((file) => readFileSync(join(process.cwd(), "supabase/migrations", file), "utf8"))
  .join("\n");

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
const escapedOwnerAdminRoleCheck = ownerAdminRoleCheck.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const orderWritePolicies = [
  { table: "customers", policy: "owners and admins manage customers", mode: "all" },
  { table: "orders", policy: "owners and admins manage orders", mode: "all" },
  { table: "order_items", policy: "owners and admins manage order items", mode: "all" },
  { table: "order_item_options", policy: "owners and admins manage order item options", mode: "all" },
  { table: "order_status_events", policy: "owners and admins append order status events", mode: "insert" },
  { table: "checkout_notifications", policy: "owners and admins manage checkout notifications", mode: "all" },
  { table: "whatsapp_events", policy: "owners and admins append whatsapp events", mode: "insert" },
  { table: "generated_documents", policy: "owners and admins manage generated documents", mode: "all" },
  { table: "audit_logs", policy: "owners and admins append audit logs", mode: "insert" },
] as const;

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
          `create policy "[^"]+" on public\\.${table}\\s+for all to authenticated\\s+using \\(${escapedOwnerAdminRoleCheck}\\)\\s+with check \\(${escapedOwnerAdminRoleCheck}\\);`,
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

describe("admin write RLS policies", () => {
  test("operators cannot mutate order and operational records directly", () => {
    for (const { table, policy, mode } of orderWritePolicies) {
      const basePattern =
        mode === "all"
          ? `create policy "${policy}" on public\\.${table}\\s+for all to authenticated\\s+using \\(${escapedOwnerAdminRoleCheck}\\)\\s+with check \\(${escapedOwnerAdminRoleCheck}\\);`
          : `create policy "${policy}" on public\\.${table}\\s+for insert to authenticated\\s+with check \\(${escapedOwnerAdminRoleCheck}\\);`;

      expect(migrationsSql).toMatch(new RegExp(basePattern, "m"));
    }
  });

  test("operators cannot write private admin storage directly", () => {
    expect(migrationsSql).toContain('drop policy if exists "admins write private files" on storage.objects;');
    expect(migrationsSql).toContain('drop policy if exists "admins update private files" on storage.objects;');
    expect(migrationsSql).toContain('drop policy if exists "admins delete private files" on storage.objects;');
    expect(migrationsSql).toContain('create policy "owners and admins write private files" on storage.objects');
    expect(migrationsSql).toContain('create policy "owners and admins update private files" on storage.objects');
    expect(migrationsSql).toContain('create policy "owners and admins delete private files" on storage.objects');
    expect(migrationsSql).toMatch(
      /bucket_id in \('generated-documents', 'admin-files'\)\s+and public\.is_active_admin\(array\['owner', 'admin'\]::public\.admin_role\[\]\)/m,
    );
  });

  test("operators cannot enumerate other admin profiles directly", () => {
    expect(migrationsSql).toContain('drop policy if exists "admins read own profile" on public.admin_profiles;');
    expect(migrationsSql).toMatch(
      /create policy "admins read own profile" on public\.admin_profiles\s+for select to authenticated\s+using \(user_id = auth\.uid\(\)\);/m,
    );
    expect(migrationsSql).toMatch(
      /create policy "owners read admin profiles" on public\.admin_profiles\s+for select to authenticated\s+using \(public\.is_active_admin\(array\['owner'\]::public\.admin_role\[\]\)\);/m,
    );
  });
});
