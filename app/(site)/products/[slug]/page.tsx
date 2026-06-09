import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CartDrawer } from "@/components/cart/cart-drawer";
import { CartProvider } from "@/components/cart/cart-provider";
import { ProductGallery } from "@/components/products/product-gallery";
import { ProductOptions } from "@/components/products/product-options";
import { Footer } from "@/components/site/footer";
import { Header } from "@/components/site/header";
import { getProductBySlug, type ProductDetail } from "@/features/products/queries";

export const dynamic = "force-dynamic";

type ProductPageProps = {
  params: {
    slug: string;
  };
};

async function loadProduct(slug: string): Promise<{ product: ProductDetail | null; error: boolean }> {
  try {
    return {
      product: await getProductBySlug(slug),
      error: false,
    };
  } catch {
    return {
      product: null,
      error: true,
    };
  }
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { product } = await loadProduct(params.slug);

  return {
    title: product ? `${product.title} | NEBESA` : "Товар | NEBESA",
    description: product?.short_description ?? "Карточка товара NEBESA",
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { product, error } = await loadProduct(params.slug);

  if (!product && !error) {
    notFound();
  }

  return (
    <CartProvider>
      <Header />
      <main className="min-h-screen bg-mist px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <Link href="/products" className="text-sm font-semibold text-moss hover:text-ink">
            Назад в каталог
          </Link>

          {product ? (
            <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_480px]">
              <ProductGallery images={product.images} title={product.title} />
              <ProductOptions product={product} />
              {product.description ? (
                <section className="rounded border border-black/10 bg-white p-5 shadow-sm lg:col-span-2">
                  <h2 className="text-xl font-semibold text-ink">Описание</h2>
                  <p className="mt-3 leading-7 text-black/65">{product.description}</p>
                </section>
              ) : null}
            </div>
          ) : (
            <div className="mt-6 rounded border border-brass/30 bg-white p-6 text-ink">
              <h1 className="text-2xl font-semibold">Карточка товара недоступна</h1>
              <p className="mt-3 text-sm leading-6 text-black/60">
                Подключите Supabase и опубликуйте товар, чтобы страница была доступна публично.
              </p>
            </div>
          )}
        </div>
      </main>
      <Footer />
      <CartDrawer />
    </CartProvider>
  );
}
