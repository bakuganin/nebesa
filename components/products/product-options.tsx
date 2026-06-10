"use client";

import { useMemo, useState } from "react";
import { Phone, ShoppingCart } from "lucide-react";

import { useCart } from "@/components/cart/cart-provider";
import { contactDetails } from "@/content/contact";
import type { ProductDetail } from "@/features/products/queries";
import { requestCartOpen } from "@/lib/cart/cart-events";
import { productPriceLabel, productPriceNoteLabel } from "./product-price";

function firstPrimaryImage(product: ProductDetail): string | null {
  return (
    [...product.images].sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order)[0]?.url ?? null
  );
}

export function ProductOptions({ product }: { product: ProductDetail }) {
  const addItem = useCart((state) => state.addItem);
  const requestOnly = product.order_mode === "inquiry_only";
  const priced = product.order_mode === "priced";
  const sortedVariants = useMemo(
    () => [...product.variants].sort((a, b) => a.sort_order - b.sort_order || a.title.localeCompare(b.title)),
    [product.variants],
  );
  const sortedOptionGroups = useMemo(
    () =>
      [...product.option_groups]
        .sort((a, b) => a.sort_order - b.sort_order || a.title.localeCompare(b.title))
        .map((group) => ({
          ...group,
          values: [...group.values].sort((a, b) => a.sort_order - b.sort_order || a.title.localeCompare(b.title)),
        })),
    [product.option_groups],
  );
  const [variantId, setVariantId] = useState(sortedVariants[0]?.id ?? "");
  const [materialId, setMaterialId] = useState(
    product.materials.find((material) => material.is_default)?.id ?? product.materials[0]?.id ?? "",
  );
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      sortedOptionGroups
        .filter((group) => group.selection_required && group.values[0])
        .map((group) => [group.id, group.values[0].id]),
    ),
  );
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  const activeVariant = sortedVariants.find((variant) => variant.id === variantId);
  const activeMaterial = product.materials.find((material) => material.id === materialId);
  const selectedOptionRows = sortedOptionGroups.flatMap((group) => {
    const valueId = selectedOptions[group.id];
    const value = group.values.find((entry) => entry.id === valueId);
    if (!value) return [];

    return [
      {
        groupId: group.id,
        valueId: value.id,
        groupTitle: group.title,
        valueTitle: value.title,
        priceDeltaCents: value.price_delta_cents,
      },
    ];
  });

  const unitPriceCents = useMemo(() => {
    const base = activeVariant?.price_cents ?? product.base_price_cents;
    if (base == null || product.order_mode !== "priced") return null;

    const materialDelta = activeMaterial?.price_delta_cents ?? 0;
    const optionsDelta = selectedOptionRows.reduce((sum, option) => sum + (option.priceDeltaCents ?? 0), 0);
    return base + materialDelta + optionsDelta;
  }, [activeMaterial?.price_delta_cents, activeVariant?.price_cents, product.base_price_cents, product.order_mode, selectedOptionRows]);

  const stockLimit = product.track_inventory && !product.allow_backorder ? Math.max(0, product.stock_quantity) : 20;
  const maxQuantity = Math.min(20, Math.max(1, stockLimit || 1));
  const outOfStock = product.availability_status === "out_of_stock" || (product.track_inventory && product.stock_quantity <= 0 && !product.allow_backorder);
  const canAdd = ((priced && unitPriceCents != null) || requestOnly) && !outOfStock;
  const priceNote = productPriceNoteLabel(product.price_note);

  function handleAdd() {
    if (!canAdd) return;

    addItem({
      productId: product.id,
      slug: product.slug,
      title: product.title,
      imageUrl: firstPrimaryImage(product),
      variantId: priced ? activeVariant?.id ?? null : null,
      variantTitle: priced ? activeVariant?.title ?? null : null,
      materialId: activeMaterial?.id ?? null,
      materialTitle: activeMaterial?.title ?? null,
      quantity,
      unitPriceCents: priced ? unitPriceCents : null,
      currency: product.currency,
      orderMode: requestOnly ? "inquiry_only" : "priced",
      options: selectedOptionRows,
    });
    setAdded(true);
    requestCartOpen();
    window.setTimeout(() => setAdded(false), 1800);
  }

  return (
    <div className="rounded border border-black/10 bg-white p-5 shadow-sm">
      <div className="grid gap-3 sm:flex sm:items-start sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-moss">{product.category?.title ?? "Каталог"}</p>
          <h1 className="mt-2 text-3xl font-semibold leading-tight text-ink">{product.title}</h1>
        </div>
        <div className="text-left text-xl font-semibold text-ink sm:text-right">
          {productPriceLabel(product, unitPriceCents)}
        </div>
      </div>

      {product.short_description ? <p className="mt-4 leading-7 text-black/65">{product.short_description}</p> : null}
      {priceNote ? <p className="mt-2 text-sm text-black/50">{priceNote}</p> : null}

      {priced && sortedVariants.length > 0 ? (
        <fieldset className="mt-6">
          <legend className="text-sm font-semibold text-ink">Комплектация</legend>
          <div className="mt-3 grid gap-2">
            {sortedVariants.map((variant) => (
              <label key={variant.id} className="flex cursor-pointer items-center justify-between rounded border border-black/10 p-3 text-sm hover:border-moss">
                <span>{variant.title}</span>
                <input
                  type="radio"
                  name="variant"
                  checked={variantId === variant.id}
                  onChange={() => setVariantId(variant.id)}
                />
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}

      {product.materials.length > 0 ? (
        <fieldset className="mt-6">
          <legend className="text-sm font-semibold text-ink">Материал</legend>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {product.materials.map((material) => (
              <label key={material.id} className="flex cursor-pointer items-center gap-2 rounded border border-black/10 p-3 text-sm hover:border-moss">
                <input
                  type="radio"
                  name="material"
                  checked={materialId === material.id}
                  onChange={() => setMaterialId(material.id)}
                />
                <span
                  className="h-5 w-5 rounded-full border border-black/10"
                  style={{ backgroundColor: material.color_hex ?? "#d7d8d2" }}
                />
                <span>{material.title}</span>
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}

      {sortedOptionGroups.map((group) => (
        <fieldset key={group.id} className="mt-6">
          <legend className="text-sm font-semibold text-ink">{group.title}</legend>
          <div className="mt-3 grid gap-2">
            {group.values.map((value) => (
              <label key={value.id} className="flex cursor-pointer items-center justify-between rounded border border-black/10 p-3 text-sm hover:border-moss">
                <span>{value.title}</span>
                <input
                  type="radio"
                  name={group.id}
                  checked={selectedOptions[group.id] === value.id}
                  onChange={() => setSelectedOptions((current) => ({ ...current, [group.id]: value.id }))}
                />
              </label>
            ))}
          </div>
        </fieldset>
      ))}

      {canAdd ? (
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <label className="grid gap-1 text-sm font-medium text-ink sm:w-28">
            Кол-во
            <input
              type="number"
              min={1}
              max={maxQuantity}
              value={quantity}
              onChange={(event) => setQuantity(Math.min(maxQuantity, Math.max(1, Number(event.target.value))))}
              className="rounded border border-black/15 px-3 py-3"
            />
          </label>
          <button
            type="button"
            onClick={handleAdd}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded bg-ink px-5 py-3 text-sm font-semibold text-white hover:bg-moss"
          >
            <ShoppingCart size={18} />
            {requestOnly ? (added ? "Заявка добавлена" : "Добавить в заявку") : added ? "Добавлено" : "Добавить в корзину"}
          </button>
        </div>
      ) : outOfStock ? (
        <button
          type="button"
          disabled
          className="mt-6 inline-flex w-full cursor-not-allowed items-center justify-center rounded border border-black/10 bg-black/5 px-5 py-3 text-sm font-semibold text-black/45"
        >
          Нет в наличии
        </button>
      ) : (
        <a
          href={`tel:${contactDetails.phone}`}
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded bg-ink px-5 py-3 text-sm font-semibold text-white hover:bg-moss"
        >
          <Phone size={18} />
          Уточнить у оператора
        </a>
      )}
    </div>
  );
}
