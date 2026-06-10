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

function slugFor(value) {
  const source = String(value ?? "").trim().toLowerCase();
  const translit = {
    а: "a",
    б: "b",
    в: "v",
    г: "g",
    д: "d",
    е: "e",
    ё: "e",
    ж: "zh",
    з: "z",
    и: "i",
    й: "i",
    к: "k",
    л: "l",
    м: "m",
    н: "n",
    о: "o",
    п: "p",
    р: "r",
    с: "s",
    т: "t",
    у: "u",
    ф: "f",
    х: "h",
    ц: "c",
    ч: "ch",
    ш: "sh",
    щ: "sch",
    ъ: "",
    ы: "y",
    ь: "",
    э: "e",
    ю: "yu",
    я: "ya",
  };
  const normalized = source
    .split("")
    .map((char) => translit[char] ?? char)
    .join("")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || "option";
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

async function upsertVariant(productId, variant) {
  const payload = {
    product_id: productId,
    sku: variant.sku ?? null,
    title: variant.title,
    price_cents: variant.priceCents ?? null,
    specs: {
      optionValues: variant.optionValues ?? {},
      needsReview: Boolean(variant.needsReview),
    },
    sort_order: variant.sortOrder ?? 0,
    is_active: !variant.disabled,
  };

  const { data: existing, error: loadError } = await supabase
    .from("product_variants")
    .select("id")
    .eq("product_id", productId)
    .eq("sku", variant.sku)
    .maybeSingle();

  if (loadError) {
    throw loadError;
  }

  if (existing) {
    const { error } = await supabase.from("product_variants").update(payload).eq("id", existing.id);
    if (error) throw error;
    return existing.id;
  }

  const { data, error } = await supabase.from("product_variants").insert(payload).select("id").single();
  if (error) throw error;
  return data.id;
}

async function upsertOptionGroup(productId, group) {
  const payload = {
    product_id: productId,
    slug: group.slug,
    title: group.title,
    selection_required: Boolean(group.required),
    min_selections: group.required ? 1 : 0,
    max_selections: Math.max(1, group.maxSelections ?? 1),
    sort_order: group.sortOrder ?? 0,
  };

  const { data: existing, error: loadError } = await supabase
    .from("product_option_groups")
    .select("id")
    .eq("product_id", productId)
    .eq("slug", group.slug)
    .maybeSingle();

  if (loadError) {
    throw loadError;
  }

  if (existing) {
    const { error } = await supabase.from("product_option_groups").update(payload).eq("id", existing.id);
    if (error) throw error;
    return existing.id;
  }

  const { data, error } = await supabase.from("product_option_groups").insert(payload).select("id").single();
  if (error) throw error;
  return data.id;
}

async function upsertOptionValue(groupId, option) {
  const slug = slugFor(option.value ?? option.title);
  const payload = {
    group_id: groupId,
    slug,
    title: option.title ?? option.value,
    price_delta_cents: option.priceDeltaCents ?? 0,
    specs: {
      sourceValue: option.value ?? option.title,
      priceCents: option.priceCents ?? null,
      priceAdjustmentMatrix: option.priceAdjustmentMatrix ?? [],
    },
    sort_order: option.sortOrder ?? 0,
    is_active: !option.disabled,
  };

  const { data: existing, error: loadError } = await supabase
    .from("product_option_values")
    .select("id")
    .eq("group_id", groupId)
    .eq("slug", slug)
    .maybeSingle();

  if (loadError) {
    throw loadError;
  }

  if (existing) {
    const { error } = await supabase.from("product_option_values").update(payload).eq("id", existing.id);
    if (error) throw error;
    return existing.id;
  }

  const { data, error } = await supabase.from("product_option_values").insert(payload).select("id").single();
  if (error) throw error;
  return data.id;
}

async function upsertVariantOptionPrice(variantId, optionValueId, priceDeltaCents) {
  const { data: existing, error: loadError } = await supabase
    .from("product_variant_option_prices")
    .select("id")
    .eq("variant_id", variantId)
    .eq("option_value_id", optionValueId)
    .maybeSingle();

  if (loadError) {
    throw loadError;
  }

  const payload = {
    variant_id: variantId,
    option_value_id: optionValueId,
    price_delta_cents: priceDeltaCents,
  };

  if (existing) {
    const { error } = await supabase.from("product_variant_option_prices").update(payload).eq("id", existing.id);
    if (error) throw error;
    return;
  }

  const { error } = await supabase.from("product_variant_option_prices").insert(payload);
  if (error) throw error;
}

async function selectAll(table, select, buildQuery) {
  const query = buildQuery(supabase.from(table).select(select));
  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return data ?? [];
}

async function updateIds(table, ids, payload) {
  if (ids.length === 0) {
    return 0;
  }

  const { error } = await supabase.from(table).update(payload).in("id", ids);
  if (error) throw error;
  return ids.length;
}

async function deleteIds(table, ids) {
  if (ids.length === 0) {
    return 0;
  }

  const { error } = await supabase.from(table).delete().in("id", ids);
  if (error) throw error;
  return ids.length;
}

async function disableStaleVariants(productId, expectedSkus) {
  const rows = await selectAll("product_variants", "id, sku, is_active", (query) =>
    query.eq("product_id", productId),
  );
  const expected = new Set(expectedSkus);
  const staleIds = rows
    .filter((row) => row.is_active && (!row.sku || !expected.has(row.sku)))
    .map((row) => row.id);

  return updateIds("product_variants", staleIds, { is_active: false });
}

async function deleteStaleOptionGroups(productId, expectedSlugs) {
  const rows = await selectAll("product_option_groups", "id, slug", (query) =>
    query.eq("product_id", productId),
  );
  const expected = new Set(expectedSlugs);
  const staleIds = rows.filter((row) => !expected.has(row.slug)).map((row) => row.id);

  return deleteIds("product_option_groups", staleIds);
}

async function disableStaleOptionValues(groupId, expectedSlugs) {
  const rows = await selectAll("product_option_values", "id, slug, is_active", (query) =>
    query.eq("group_id", groupId),
  );
  const expected = new Set(expectedSlugs);
  const staleIds = rows
    .filter((row) => row.is_active && !expected.has(row.slug))
    .map((row) => row.id);

  return updateIds("product_option_values", staleIds, { is_active: false });
}

async function deleteStaleVariantOptionPrices(productId, expectedPairs) {
  const variants = await selectAll("product_variants", "id", (query) => query.eq("product_id", productId));
  const variantIds = variants.map((variant) => variant.id);

  if (variantIds.length === 0) {
    return 0;
  }

  const groups = await selectAll("product_option_groups", "id", (query) => query.eq("product_id", productId));
  const groupIds = groups.map((group) => group.id);

  if (groupIds.length === 0) {
    return 0;
  }

  const values = await selectAll("product_option_values", "id", (query) => query.in("group_id", groupIds));
  const valueIds = new Set(values.map((value) => value.id));

  if (valueIds.size === 0) {
    return 0;
  }

  const prices = await selectAll("product_variant_option_prices", "id, variant_id, option_value_id", (query) =>
    query.in("variant_id", variantIds),
  );
  const staleIds = prices
    .filter((price) => valueIds.has(price.option_value_id))
    .filter((price) => !expectedPairs.has(`${price.variant_id}:${price.option_value_id}`))
    .map((price) => price.id);

  return deleteIds("product_variant_option_prices", staleIds);
}

async function publishProductChildren(productId, product) {
  const variantIdsByCapacity = new Map();
  const expectedVariantSkus = (product.variants ?? []).map((variant) => variant.sku).filter(Boolean);
  const expectedGroupSlugs = (product.optionGroups ?? []).map((group) => group.slug);
  const expectedPricePairs = new Set();
  let cleaned = 0;

  for (const variant of product.variants ?? []) {
    const variantId = await upsertVariant(productId, variant);
    const capacity = variant.optionValues?.capacity;

    if (capacity) {
      variantIdsByCapacity.set(capacity, variantId);
    }
  }

  for (const group of product.optionGroups ?? []) {
    const groupId = await upsertOptionGroup(productId, group);
    const expectedValueSlugs = (group.options ?? []).map((option) => slugFor(option.value ?? option.title));

    for (const option of group.options ?? []) {
      const optionValueId = await upsertOptionValue(groupId, option);

      for (const adjustment of option.priceAdjustmentMatrix ?? []) {
        const variantId = variantIdsByCapacity.get(adjustment.capacity);
        if (variantId) {
          await upsertVariantOptionPrice(variantId, optionValueId, adjustment.priceCents ?? 0);
          expectedPricePairs.add(`${variantId}:${optionValueId}`);
        }
      }
    }

    cleaned += await disableStaleOptionValues(groupId, expectedValueSlugs);
  }

  cleaned += await disableStaleVariants(productId, expectedVariantSkus);
  cleaned += await deleteStaleOptionGroups(productId, expectedGroupSlugs);
  cleaned += await deleteStaleVariantOptionPrices(productId, expectedPricePairs);

  return { cleaned };
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
let childrenUpdated = 0;
let childrenCleaned = 0;
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

  try {
    const childResult = await publishProductChildren(data.id, product);
    childrenUpdated += (product.variants?.length ?? 0) + (product.optionGroups ?? []).reduce(
      (sum, group) => sum + 1 + (group.options?.length ?? 0),
      0,
    );
    childrenCleaned += childResult.cleaned;
  } catch (error) {
    failures.push(`${product.slug} children: ${error.message}`);
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

console.log(JSON.stringify({ updated, childrenUpdated, childrenCleaned, missingProducts, publicCount, failures }, null, 2));

if (failures.length > 0) {
  process.exitCode = 1;
}
