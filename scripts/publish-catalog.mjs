import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

function readEnvFile(filePath) {
  const env = {};
  const raw = readFileSync(filePath, "utf8");

  for (const line of raw.split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match) {
      env[match[1]] = match[2].replace(/^"|"$/g, "");
    }
  }

  return env;
}

function priceKindFor(product) {
  if (product.orderMode === "priced") return "fixed";
  if (product.priceNote === "from") return "from";
  if (product.priceNote) return "request";
  return "none";
}

function dbPayload(product) {
  const active = product.status === "active" && product.visibility === "public" && !product.needsReview;

  return {
    status: product.status,
    visibility: product.visibility,
    order_mode: product.orderMode,
    requires_review: Boolean(product.needsReview),
    base_price_cents: product.minPriceCents ?? null,
    price_kind: priceKindFor(product),
    price_note: product.priceNote ?? null,
    specs: product.specs ?? { technicalSpecs: product.technicalSpecs ?? [] },
    import_warnings: product.importWarnings ?? [],
    published_at: active ? new Date().toISOString() : null,
  };
}

const env = readEnvFile(".env.local");
const requiredKeys = ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"];
const missing = requiredKeys.filter((key) => !env[key]);

if (missing.length > 0) {
  throw new Error(`Missing env keys: ${missing.join(", ")}`);
}

const seed = JSON.parse(readFileSync("supabase/seed/catalog.seed.json", "utf8"));
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

let updated = 0;
let missingProducts = 0;
const failures = [];

for (const product of seed.products) {
  const { data, error } = await supabase
    .from("products")
    .update(dbPayload(product))
    .eq("slug", product.slug)
    .select("id")
    .maybeSingle();

  if (error) {
    failures.push(`${product.slug}: ${error.message}`);
    continue;
  }

  if (!data) {
    missingProducts += 1;
    continue;
  }

  updated += 1;
}

const { count: publicCount, error: publicError } = await supabase
  .from("products")
  .select("id", { count: "exact", head: true })
  .eq("status", "active")
  .eq("visibility", "public")
  .eq("requires_review", false);

if (publicError) {
  failures.push(`public count: ${publicError.message}`);
}

console.log(JSON.stringify({ updated, missingProducts, publicCount, failures }, null, 2));

if (failures.length > 0) {
  process.exitCode = 1;
}
