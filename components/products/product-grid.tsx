import type { ProductSummary } from "@/features/products/queries";
import { ProductCard } from "./product-card";

export function ProductGrid({ products }: { products: ProductSummary[] }) {
  if (products.length === 0) {
    return (
      <div className="rounded border border-dashed border-black/20 bg-white p-8 text-center">
        <h2 className="text-2xl font-semibold text-ink">Каталог готовится к публикации</h2>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-black/60">
          Импортированные позиции проходят проверку фотографий, цен и комплектаций. После публикации товары появятся здесь.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
