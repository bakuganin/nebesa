"use client";

import Link from "next/link";
import { Check, ShoppingCart } from "lucide-react";
import { useState } from "react";

import { useCart } from "@/components/cart/cart-provider";
import type { ProductSummary } from "@/features/products/queries";
import { requestCartOpen } from "@/lib/cart/cart-events";

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

function isSimpleInquiryProduct(product: ProductSummary): boolean {
  const variantRows = product.variant_rows ?? [];
  const optionGroupRows = product.option_group_rows ?? [];
  const materialRows = product.material_rows ?? [];

  return (
    product.order_mode === "inquiry_only" &&
    product.availability_status !== "out_of_stock" &&
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
          requestCartOpen();
          window.setTimeout(() => setAdded(false), 1600);
        }}
      >
        {added ? <Check size={16} /> : <ShoppingCart size={16} />}
        {added ? "Добавлено" : "В корзину"}
      </button>
    );
  }

  if (isSimpleInquiryProduct(product)) {
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
            unitPriceCents: null,
            currency: product.currency,
            orderMode: "inquiry_only",
          });
          setAdded(true);
          requestCartOpen();
          window.setTimeout(() => setAdded(false), 1600);
        }}
      >
        {added ? <Check size={16} /> : <ShoppingCart size={16} />}
        {added ? "В заявке" : "В заявку"}
      </button>
    );
  }

  if (product.order_mode === "inquiry_only") {
    return (
      <Link
        href={`/products/${product.slug}`}
        className="inline-flex h-10 items-center justify-center rounded bg-ink px-3 text-sm font-semibold text-white transition hover:bg-moss"
      >
        Выбрать
      </Link>
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
