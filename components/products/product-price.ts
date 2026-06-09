import { formatCurrency } from "@/lib/format";

type ProductPriceLike = {
  base_price_cents: number | null;
  currency: string;
  price_kind: string;
  price_note: string | null;
  order_mode: string;
};

export function productPriceLabel(product: ProductPriceLike, selectedPriceCents?: number | null): string {
  const priceCents = selectedPriceCents ?? product.base_price_cents;

  if (typeof priceCents !== "number") {
    return "Цена по запросу";
  }

  if (product.price_kind === "from" || product.price_note === "from") {
    return `От ${formatCurrency(priceCents, product.currency)}`;
  }

  return formatCurrency(priceCents, product.currency);
}

export function productPriceNoteLabel(note: string | null): string | null {
  if (!note) return null;

  const labels: Record<string, string> = {
    fixed: "Фиксированная цена",
    from: "Ориентировочная стартовая цена",
    request: "Цена уточняется у оператора",
  };

  return labels[note] ?? note;
}
