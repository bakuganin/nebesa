import Link from "next/link";
import type { Metadata } from "next";

import { CartDrawer } from "@/components/cart/cart-drawer";
import { CartProvider } from "@/components/cart/cart-provider";
import { Footer } from "@/components/site/footer";
import { Header } from "@/components/site/header";
import { Pagination } from "@/components/products/pagination";
import { ProductGrid } from "@/components/products/product-grid";
import { getActiveCategories, getActiveProducts, type ProductCategory, type ProductSummary } from "@/features/products/queries";

export const dynamic = "force-dynamic";

const pageSize = 24;

type ProductsPageProps = {
  searchParams: {
    category?: string;
    page?: string;
  };
};

export const metadata: Metadata = {
  title: "Каталог ритуальных товаров | NEBESA",
  description: "Опубликованные ритуальные товары NEBESA: венки, гробы, памятники и сопутствующие позиции.",
};

async function loadCatalog(category: string | undefined, page: number): Promise<{
  products: ProductSummary[];
  categories: ProductCategory[];
  count: number;
  error: boolean;
}> {
  try {
    const [categories, result] = await Promise.all([
      getActiveCategories(),
      getActiveProducts({ category, page, limit: pageSize }),
    ]);

    return {
      categories,
      products: result.products,
      count: result.count,
      error: false,
    };
  } catch {
    return {
      categories: [],
      products: [],
      count: 0,
      error: true,
    };
  }
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const page = Math.max(1, Number(searchParams.page ?? 1) || 1);
  const category = searchParams.category;
  const { categories, products, count, error } = await loadCatalog(category, page);
  const pageCount = Math.ceil(count / pageSize);

  return (
    <CartProvider>
      <Header />
      <main className="min-h-screen bg-mist px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-4 border-b border-black/10 pb-8 md:grid-cols-[1fr_auto] md:items-end">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-moss">Каталог</p>
              <h1 className="mt-2 text-4xl font-semibold text-ink">Ритуальные товары</h1>
              <p className="mt-3 max-w-2xl leading-7 text-black/65">
                Здесь отображаются только проверенные и опубликованные позиции. Черновики из старого каталога остаются закрытыми до ручной проверки.
              </p>
            </div>
            <Link href="/services/ritual-products" className="text-sm font-semibold text-moss hover:text-ink">
              Смотреть исходный раздел
            </Link>
          </div>

          {error ? (
            <div className="mt-6 rounded border border-brass/30 bg-white p-4 text-sm text-ink">
              Каталог ожидает подключение Supabase. После настройки окружения и публикации товаров список появится здесь.
            </div>
          ) : null}

          {categories.length > 0 ? (
            <div className="mt-6 flex flex-wrap gap-2">
              <Link
                href="/products"
                className={`rounded-full border px-4 py-2 text-sm ${
                  !category ? "border-ink bg-ink text-white" : "border-black/10 bg-white text-ink hover:border-moss"
                }`}
              >
                Все
              </Link>
              {categories.map((entry) => (
                <Link
                  key={entry.id}
                  href={`/products?category=${entry.slug}`}
                  className={`rounded-full border px-4 py-2 text-sm ${
                    category === entry.slug
                      ? "border-ink bg-ink text-white"
                      : "border-black/10 bg-white text-ink hover:border-moss"
                  }`}
                >
                  {entry.title}
                </Link>
              ))}
            </div>
          ) : null}

          <div className="mt-8">
            <ProductGrid products={products} />
            <Pagination page={page} pageCount={pageCount} basePath="/products" query={{ category }} />
          </div>
        </div>
      </main>
      <Footer />
      <CartDrawer />
    </CartProvider>
  );
}
