import "server-only";

import { adminReadRoles } from "./access";
import { runAdminQuery, type AdminQueryResult } from "./safe-query";

export type AdminCategory = {
  id: string;
  parent_id: string | null;
  slug: string;
  title: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
  source_page: string | null;
  import_warnings: unknown;
  updated_at: string;
};

export type AdminProductListItem = {
  id: string;
  slug: string;
  title: string;
  status: string;
  visibility: string;
  order_mode: string;
  availability_status: string;
  track_inventory: boolean;
  stock_quantity: number;
  low_stock_threshold: number;
  allow_backorder: boolean;
  requires_review: boolean;
  base_price_cents: number | null;
  price_kind: string;
  currency: string;
  updated_at: string;
  categoryTitle: string | null;
  primaryImageUrl: string | null;
  warningsCount: number;
};

export type AdminProductFormRecord = {
  id: string;
  category_id: string | null;
  slug: string;
  title: string;
  short_description: string | null;
  description: string | null;
  status: string;
  visibility: string;
  order_mode: string;
  availability_status: string;
  track_inventory: boolean;
  stock_quantity: number;
  low_stock_threshold: number;
  allow_backorder: boolean;
  requires_review: boolean;
  base_price_cents: number | null;
  price_kind: string;
  price_note: string | null;
  currency: string;
  sort_order: number;
  updated_at: string;
};

export type AdminProductImage = {
  id: string;
  url: string;
  alt: string | null;
  storage_bucket: string;
  storage_path: string | null;
  sort_order: number;
  is_primary: boolean;
};

export type AdminProductsPageData = {
  products: AdminProductListItem[];
  count: number;
};

export type AdminProductFormData = {
  product: AdminProductFormRecord | null;
  images: AdminProductImage[];
  categories: AdminCategory[];
};

export type AdminCategoriesPageData = {
  categories: AdminCategory[];
};

type ProductRow = Omit<
  AdminProductListItem,
  "categoryTitle" | "primaryImageUrl" | "warningsCount"
> & {
  category: { title: string } | null;
  images: Array<{
    url: string;
    is_primary: boolean;
    sort_order: number;
  }> | null;
  import_warnings: unknown;
};

const emptyProductsPageData: AdminProductsPageData = {
  products: [],
  count: 0,
};

const emptyProductFormData: AdminProductFormData = {
  product: null,
  images: [],
  categories: [],
};

const emptyCategoriesPageData: AdminCategoriesPageData = {
  categories: [],
};

function warningsCount(value: unknown): number {
  return Array.isArray(value) ? value.length : 0;
}

function primaryImageUrl(images: ProductRow["images"]): string | null {
  if (!images || images.length === 0) {
    return null;
  }

  const sorted = [...images].sort((left, right) => {
    if (left.is_primary !== right.is_primary) {
      return left.is_primary ? -1 : 1;
    }

    return left.sort_order - right.sort_order;
  });

  return sorted[0]?.url ?? null;
}

function mapProductRow(row: ProductRow): AdminProductListItem {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    status: row.status,
    visibility: row.visibility,
    order_mode: row.order_mode,
    availability_status: row.availability_status,
    track_inventory: row.track_inventory,
    stock_quantity: row.stock_quantity,
    low_stock_threshold: row.low_stock_threshold,
    allow_backorder: row.allow_backorder,
    requires_review: row.requires_review,
    base_price_cents: row.base_price_cents,
    price_kind: row.price_kind,
    currency: row.currency,
    updated_at: row.updated_at,
    categoryTitle: row.category?.title ?? null,
    primaryImageUrl: primaryImageUrl(row.images),
    warningsCount: warningsCount(row.import_warnings),
  };
}

export async function getAdminProductsPageData(): Promise<AdminQueryResult<AdminProductsPageData>> {
  return runAdminQuery(emptyProductsPageData, async ({ supabase }) => {
    const { data, error, count } = await supabase
      .from("products")
      .select(
        `
          id,
          slug,
          title,
          status,
          visibility,
          order_mode,
          availability_status,
          track_inventory,
          stock_quantity,
          low_stock_threshold,
          allow_backorder,
          requires_review,
          base_price_cents,
          price_kind,
          currency,
          updated_at,
          import_warnings,
          category:product_categories(title),
          images:product_images(url, is_primary, sort_order)
        `,
        { count: "exact" },
      )
      .order("updated_at", { ascending: false })
      .limit(100);

    if (error) {
      throw error;
    }

    return {
      products: ((data ?? []) as unknown as ProductRow[]).map(mapProductRow),
      count: count ?? 0,
    };
  }, adminReadRoles);
}

export async function getAdminCategoriesPageData(): Promise<AdminQueryResult<AdminCategoriesPageData>> {
  return runAdminQuery(emptyCategoriesPageData, async ({ supabase }) => {
    const { data, error } = await supabase
      .from("product_categories")
      .select("id, parent_id, slug, title, description, sort_order, is_active, source_page, import_warnings, updated_at")
      .order("sort_order", { ascending: true })
      .order("title", { ascending: true });

    if (error) {
      throw error;
    }

    return {
      categories: (data ?? []) as AdminCategory[],
    };
  }, adminReadRoles);
}

export async function getAdminProductFormData(
  productId?: string,
): Promise<AdminQueryResult<AdminProductFormData>> {
  return runAdminQuery(emptyProductFormData, async ({ supabase }) => {
    const categoriesPromise = supabase
      .from("product_categories")
      .select("id, parent_id, slug, title, description, sort_order, is_active, source_page, import_warnings, updated_at")
      .order("sort_order", { ascending: true })
      .order("title", { ascending: true });

    const productPromise = productId
      ? supabase
          .from("products")
          .select(
            "id, category_id, slug, title, short_description, description, status, visibility, order_mode, availability_status, track_inventory, stock_quantity, low_stock_threshold, allow_backorder, requires_review, base_price_cents, price_kind, price_note, currency, sort_order, updated_at",
          )
          .eq("id", productId)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null });

    const imagesPromise = productId
      ? supabase
          .from("product_images")
          .select("id, url, alt, storage_bucket, storage_path, sort_order, is_primary")
          .eq("product_id", productId)
          .order("sort_order", { ascending: true })
      : Promise.resolve({ data: [], error: null });

    const [categoriesResult, productResult, imagesResult] = await Promise.all([categoriesPromise, productPromise, imagesPromise]);

    if (categoriesResult.error) {
      throw categoriesResult.error;
    }

    if (productResult.error) {
      throw productResult.error;
    }

    if (imagesResult.error) {
      throw imagesResult.error;
    }

    return {
      categories: (categoriesResult.data ?? []) as AdminCategory[],
      product: (productResult.data ?? null) as AdminProductFormRecord | null,
      images: (imagesResult.data ?? []) as AdminProductImage[],
    };
  }, adminReadRoles);
}
