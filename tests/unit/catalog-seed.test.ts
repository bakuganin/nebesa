import { readFileSync } from "node:fs";

import { describe, expect, test } from "vitest";

const allowedOrderModes = new Set(["disabled", "priced", "inquiry_only"]);
const allowedPriceNotes = new Set(["from", "fixed", "Цена зависит от комплектации"]);

describe("catalog seed", () => {
  test("uses product order modes supported by the database enum", () => {
    const seed = JSON.parse(readFileSync("supabase/seed/catalog.seed.json", "utf8")) as {
      products: Array<{
        orderMode: string;
        slug: string;
      }>;
    };
    const invalidProducts = seed.products
      .filter((product) => !allowedOrderModes.has(product.orderMode))
      .map((product) => `${product.slug}:${product.orderMode}`);

    expect(invalidProducts).toEqual([]);
  });

  test("keeps configurable grave borders out of priced checkout until runtime pricing supports matrices", () => {
    const seed = JSON.parse(readFileSync("supabase/seed/catalog.seed.json", "utf8")) as {
      products: Array<{
        categorySlug: string;
        orderMode: string;
        priceNote: string | null;
        priceMatrix?: unknown[];
        slug: string;
      }>;
    };
    const graveBorders = seed.products.filter((product) => product.categorySlug === "grave-borders");
    const unsafeProducts = graveBorders
      .filter((product) => product.orderMode !== "inquiry_only" || product.priceNote === "configurable")
      .map((product) => `${product.slug}:${product.orderMode}:${product.priceNote}`);

    expect(unsafeProducts).toEqual([]);
    expect(graveBorders.every((product) => Array.isArray(product.priceMatrix))).toBe(true);
  });

  test("does not use legacy price note values that look like database enum values", () => {
    const seed = JSON.parse(readFileSync("supabase/seed/catalog.seed.json", "utf8")) as {
      products: Array<{
        priceNote: string | null;
        slug: string;
      }>;
    };
    const invalidNotes = seed.products
      .filter((product) => product.priceNote !== null && !allowedPriceNotes.has(product.priceNote))
      .map((product) => `${product.slug}:${product.priceNote}`);

    expect(invalidNotes).toEqual([]);
  });
});
