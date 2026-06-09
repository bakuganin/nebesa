import Image from "next/image";
import Link from "next/link";

import type { ProductSummary } from "@/features/products/queries";
import { formatCurrency } from "@/lib/format";

export function ProductCard({ product }: { product: ProductSummary }) {
  const primaryImage = [...product.images].sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order)[0];

  return (
    <Link
      href={`/products/${product.slug}`}
      className="group grid overflow-hidden rounded border border-black/10 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="relative aspect-[4/3] bg-mist">
        {primaryImage ? (
          <Image
            src={primaryImage.url}
            alt={primaryImage.alt ?? product.title}
            fill
            className="object-cover transition duration-300 group-hover:scale-[1.03]"
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
          />
        ) : null}
      </div>
      <div className="grid gap-3 p-4">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-moss">{product.category?.title ?? "Каталог"}</p>
          <h3 className="mt-1 text-lg font-semibold text-ink">{product.title}</h3>
        </div>
        {product.short_description ? (
          <p className="line-clamp-2 text-sm leading-6 text-black/60">{product.short_description}</p>
        ) : null}
        <div className="flex items-center justify-between gap-3">
          <span className="text-base font-semibold text-ink">
            {product.order_mode === "inquiry_only"
              ? "Цена по запросу"
              : formatCurrency(product.base_price_cents, product.currency)}
          </span>
          <span className="text-sm text-moss">Подробнее</span>
        </div>
      </div>
    </Link>
  );
}
