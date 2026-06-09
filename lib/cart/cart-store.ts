import { createStore } from "zustand/vanilla";

import type { CartItemInput, CartLine, CartTotals, CheckoutCartItem } from "./cart-types";

const minQuantity = 1;
const maxQuantity = 20;

function cleanNullableId(value: string | null | undefined): string {
  return value?.trim() ?? "";
}

function normalizedOptions(input: CartItemInput): NonNullable<CartItemInput["options"]> {
  return [...(input.options ?? [])]
    .filter((option) => option.groupId.trim() && option.valueId.trim())
    .sort((a, b) => `${a.groupId}:${a.valueId}`.localeCompare(`${b.groupId}:${b.valueId}`));
}

export function normalizeQuantity(quantity: number): number {
  if (!Number.isFinite(quantity)) {
    return minQuantity;
  }

  return Math.min(maxQuantity, Math.max(minQuantity, Math.floor(quantity)));
}

export function createCartLineKey(input: CartItemInput): string {
  const optionKey = normalizedOptions(input)
    .map((option) => `${option.groupId}:${option.valueId}`)
    .join(",");

  return [
    input.productId,
    cleanNullableId(input.variantId),
    cleanNullableId(input.materialId),
    optionKey,
  ].join("|");
}

export function createCartLine(input: CartItemInput): CartLine {
  return {
    ...input,
    key: createCartLineKey(input),
    quantity: normalizeQuantity(input.quantity),
    options: normalizedOptions(input),
  };
}

export function calculateCartTotals(items: CartLine[]): CartTotals {
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const currency = items[0]?.currency ?? "EUR";
  const hasInquiryItems = items.some((item) => item.orderMode !== "priced" || item.unitPriceCents == null);
  const subtotalCents = items.reduce((sum, item) => {
    if (item.orderMode !== "priced" || item.unitPriceCents == null) {
      return sum;
    }

    return sum + item.unitPriceCents * item.quantity;
  }, 0);

  return {
    itemCount,
    subtotalCents,
    currency,
    canCheckout: items.length > 0 && !hasInquiryItems,
    hasInquiryItems,
  };
}

export function toCheckoutCartItems(items: CartLine[]): CheckoutCartItem[] {
  return items.map((item) => ({
    productId: item.productId,
    variantId: item.variantId ?? undefined,
    materialId: item.materialId ?? undefined,
    quantity: item.quantity,
    options: item.options?.map((option) => ({
      groupId: option.groupId,
      valueId: option.valueId,
    })),
  }));
}

export type CartState = {
  items: CartLine[];
  totals: CartTotals;
  hydrate: (items: CartLine[]) => void;
  addItem: (item: CartItemInput) => void;
  updateQuantity: (key: string, quantity: number) => void;
  removeItem: (key: string) => void;
  clear: () => void;
};

function withTotals(items: CartLine[]): Pick<CartState, "items" | "totals"> {
  return {
    items,
    totals: calculateCartTotals(items),
  };
}

export function createCartStore(initialItems: CartLine[] = []) {
  return createStore<CartState>((set) => ({
    ...withTotals(initialItems),
    hydrate: (items) => set(withTotals(items.map((item) => createCartLine(item)))),
    addItem: (item) =>
      set((state) => {
        const line = createCartLine(item);
        const existing = state.items.find((entry) => entry.key === line.key);

        if (!existing) {
          return withTotals([...state.items, line]);
        }

        return withTotals(
          state.items.map((entry) =>
            entry.key === line.key
              ? { ...entry, quantity: normalizeQuantity(entry.quantity + line.quantity) }
              : entry,
          ),
        );
      }),
    updateQuantity: (key, quantity) =>
      set((state) =>
        withTotals(
          state.items.map((item) =>
            item.key === key ? { ...item, quantity: normalizeQuantity(quantity) } : item,
          ),
        ),
      ),
    removeItem: (key) => set((state) => withTotals(state.items.filter((item) => item.key !== key))),
    clear: () => set(withTotals([])),
  }));
}

export const cartStore = createCartStore();
