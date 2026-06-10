import Image from "next/image";
import Link from "next/link";

import type { ProductSummary } from "@/features/products/queries";
import { ProductCardActions } from "./product-card-actions";
import { productPriceLabel } from "./product-price";

export function ProductCard({ product }: { product: ProductSummary }) {
  const primaryImage = [...(product.images ?? [])].sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order)[0];

  return (
    <article data-product-card className="group grid overflow-hidden rounded border border-black/10 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <Link href={`/products/${product.slug}`} className="relative aspect-[4/3] bg-mist">
        {primaryImage ? (
          <Image
            src={primaryImage.url}
            alt={primaryImage.alt ?? product.title}
            fill
            className="object-cover transition duration-300 group-hover:scale-[1.03]"
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center px-6 text-center">
            <div>
              <div className="text-xs uppercase tracking-[0.18em] text-moss">{product.category?.title ?? "Каталог"}</div>
              <div className="mt-2 text-sm font-semibold text-ink">Фото скоро</div>
            </div>
          </div>
        )}
      </Link>
      <div className="grid gap-3 p-4">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-moss">{product.category?.title ?? "Каталог"}</p>
          <h3 className="mt-1 text-lg font-semibold text-ink">
            <Link href={`/products/${product.slug}`} className="hover:text-moss">
              {product.title}
            </Link>
          </h3>
        </div>
        {product.short_description ? (
          <p className="line-clamp-2 text-sm leading-6 text-black/60">{product.short_description}</p>
        ) : null}
        <div className="flex items-center justify-between gap-3">
          <span className="text-base font-semibold text-ink">
            {productPriceLabel(product)}
          </span>
          <Link href={`/products/${product.slug}`} className="text-sm font-medium text-moss hover:text-ink">
            Подробнее
          </Link>
        </div>
        <ProductCardActions product={product} />
      </div>
    </article>
  );
}
