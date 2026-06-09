import { createServerSupabaseClient } from "../../lib/supabase/server";

type QueryClient = ReturnType<typeof createServerSupabaseClient>;

export type ActiveProductsParams = {
  category?: string;
  page?: number;
  limit?: number;
};

export type ProductCategory = {
  id: string;
  slug: string;
  title: string;
  parent_id: string | null;
  sort_order: number;
};

export type ProductImage = {
  id: string;
  url: string;
  alt: string | null;
  sort_order: number;
  is_primary: boolean;
};

export type ProductSummary = {
  id: string;
  slug: string;
  title: string;
  short_description: string | null;
  base_price_cents: number | null;
  price_kind: string;
  price_note: string | null;
  currency: string;
  order_mode: "disabled" | "priced" | "inquiry_only";
  availability_status: "available" | "out_of_stock" | "made_to_order";
  track_inventory: boolean;
  stock_quantity: number;
  allow_backorder: boolean;
  category: ProductCategory | null;
  images: ProductImage[];
  variant_rows: Array<{ id: string }>;
  option_group_rows: Array<{ id: string }>;
  material_rows: Array<{ material_id: string }>;
};

export type ProductDetail = ProductSummary & {
  description: string | null;
  specs: Record<string, unknown>;
  variants: Array<{
    id: string;
    sku: string | null;
    title: string;
    price_cents: number | null;
    specs: Record<string, unknown>;
    sort_order: number;
  }>;
  option_groups: Array<{
    id: string;
    slug: string;
    title: string;
    selection_required: boolean;
    min_selections: number;
    max_selections: number;
    sort_order: number;
    values: Array<{
      id: string;
      slug: string;
      title: string;
      price_delta_cents: number;
      specs: Record<string, unknown>;
      sort_order: number;
    }>;
  }>;
  materials: Array<{
    id: string;
    slug: string;
    title: string;
    color_hex: string | null;
    image_url: string | null;
    price_delta_cents: number;
    is_default: boolean;
  }>;
};

type ProductMaterialJoin = {
  price_delta_cents: number;
  is_default: boolean;
  material: Omit<ProductDetail["materials"][number], "price_delta_cents" | "is_default">;
};

const publicProductFilters = {
  status: "active",
  visibility: "public",
  requires_review: false,
} as const;

function normalizePage(page: number | undefined): number {
  return Math.max(1, Math.floor(page ?? 1));
}

function normalizeLimit(limit: number | undefined): number {
  return Math.min(60, Math.max(1, Math.floor(limit ?? 24)));
}

async function resolveCategoryId(
  supabase: QueryClient,
  slug: string | undefined,
): Promise<string | null | undefined> {
  if (!slug) {
    return undefined;
  }

  const { data, error } = await supabase
    .from("product_categories")
    .select("id")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data?.id ?? null;
}

export async function getActiveProducts(
  params: ActiveProductsParams = {},
  supabase: QueryClient = createServerSupabaseClient(),
): Promise<{ products: ProductSummary[]; count: number }> {
  const page = normalizePage(params.page);
  const limit = normalizeLimit(params.limit);
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  const categoryId = await resolveCategoryId(supabase, params.category);

  if (categoryId === null) {
    return { products: [], count: 0 };
  }

  let query = supabase
    .from("products")
    .select(
      `
        id,
        slug,
        title,
        short_description,
        base_price_cents,
        price_kind,
        price_note,
        currency,
        order_mode,
        availability_status,
        track_inventory,
        stock_quantity,
        allow_backorder,
        category:product_categories(id, slug, title, parent_id, sort_order),
        images:product_images(id, url, alt, sort_order, is_primary),
        variant_rows:product_variants(id),
        option_group_rows:product_option_groups(id),
        material_rows:product_materials(material_id)
      `,
      { count: "exact" },
    )
    .eq("status", publicProductFilters.status)
    .eq("visibility", publicProductFilters.visibility)
    .eq("requires_review", publicProductFilters.requires_review)
    .range(from, to)
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("title", { ascending: true });

  if (categoryId) {
    query = query.eq("category_id", categoryId);
  }

  const { data, error, count } = await query;

  if (error) {
    throw error;
  }

  return {
    products: (data ?? []) as unknown as ProductSummary[],
    count: count ?? 0,
  };
}

export async function getProductBySlug(
  slug: string,
  supabase: QueryClient = createServerSupabaseClient(),
): Promise<ProductDetail | null> {
  const normalizedSlug = slug.trim();

  if (!normalizedSlug) {
    return null;
  }

  const { data, error } = await supabase
    .from("products")
    .select(
      `
        id,
        slug,
        title,
        short_description,
        description,
        base_price_cents,
        price_kind,
        price_note,
        currency,
        order_mode,
        availability_status,
        track_inventory,
        stock_quantity,
        allow_backorder,
        specs,
        category:product_categories(id, slug, title, parent_id, sort_order),
        images:product_images(id, url, alt, sort_order, is_primary),
        variants:product_variants(id, sku, title, price_cents, specs, sort_order),
        option_groups:product_option_groups(
          id,
          slug,
          title,
          selection_required,
          min_selections,
          max_selections,
          sort_order,
          values:product_option_values(id, slug, title, price_delta_cents, specs, sort_order)
        ),
        materials:product_materials(
          price_delta_cents,
          is_default,
          material:materials(id, slug, title, color_hex, image_url)
        )
      `,
    )
    .eq("slug", normalizedSlug)
    .eq("status", publicProductFilters.status)
    .eq("visibility", publicProductFilters.visibility)
    .eq("requires_review", publicProductFilters.requires_review)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  const product = data as unknown as Omit<ProductDetail, "materials"> & {
    materials: ProductMaterialJoin[];
  };

  return {
    ...product,
    materials: product.materials.map((entry) => ({
      ...entry.material,
      price_delta_cents: entry.price_delta_cents,
      is_default: entry.is_default,
    })),
  };
}

export async function getActiveCategories(
  supabase: QueryClient = createServerSupabaseClient(),
): Promise<ProductCategory[]> {
  const { data, error } = await supabase
    .from("product_categories")
    .select("id, slug, title, parent_id, sort_order")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("title", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as ProductCategory[];
}
