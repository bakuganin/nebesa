"use client";

import Link from "next/link";
import { Check, Phone, ShoppingCart } from "lucide-react";
import { useState } from "react";

import { useCart } from "@/components/cart/cart-provider";
import { contactDetails } from "@/content/contact";
import type { ProductSummary } from "@/features/products/queries";

function primaryImageUrl(product: ProductSummary): string | null {
  const images = product.images ?? [];

  return (
    [...images].sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order)[0]?.url ??
    null
  );
}

function isSimplePricedProduct(product: ProductSummary): boolean {
  const variantRows = product.variant_rows ?? [];
  const optionGroupRows = product.option_group_rows ?? [];
  const materialRows = product.material_rows ?? [];

  return (
    product.order_mode === "priced" &&
    product.base_price_cents != null &&
    product.availability_status !== "out_of_stock" &&
    (!product.track_inventory || product.stock_quantity > 0 || product.allow_backorder) &&
    variantRows.length === 0 &&
    optionGroupRows.length === 0 &&
    materialRows.length === 0
  );
}

export function ProductCardActions({ product }: { product: ProductSummary }) {
  const addItem = useCart((state) => state.addItem);
  const [added, setAdded] = useState(false);
  const outOfStock =
    product.availability_status === "out_of_stock" ||
    (product.track_inventory && product.stock_quantity <= 0 && !product.allow_backorder);

  if (outOfStock) {
    return (
      <button
        type="button"
        disabled
        className="inline-flex h-10 items-center justify-center rounded border border-black/10 bg-black/5 px-3 text-sm font-semibold text-black/45"
      >
        Нет в наличии
      </button>
    );
  }

  if (isSimplePricedProduct(product)) {
    return (
      <button
        type="button"
        className="inline-flex h-10 items-center justify-center gap-2 rounded bg-ink px-3 text-sm font-semibold text-white transition hover:bg-moss"
        onClick={() => {
          addItem({
            productId: product.id,
            slug: product.slug,
            title: product.title,
            imageUrl: primaryImageUrl(product),
            quantity: 1,
            unitPriceCents: product.base_price_cents,
            currency: product.currency,
            orderMode: "priced",
          });
          setAdded(true);
          window.setTimeout(() => setAdded(false), 1600);
        }}
      >
        {added ? <Check size={16} /> : <ShoppingCart size={16} />}
        {added ? "Добавлено" : "В корзину"}
      </button>
    );
  }

  if (product.order_mode === "inquiry_only") {
    return (
      <a
        href={`tel:${contactDetails.phone}`}
        className="inline-flex h-10 items-center justify-center gap-2 rounded border border-black/10 bg-white px-3 text-sm font-semibold text-ink transition hover:border-moss"
      >
        <Phone size={16} />
        Уточнить
      </a>
    );
  }

  return (
    <Link
      href={`/products/${product.slug}`}
      className="inline-flex h-10 items-center justify-center rounded bg-ink px-3 text-sm font-semibold text-white transition hover:bg-moss"
    >
      Выбрать
    </Link>
  );
}
