import { describe, expect, it } from "vitest";

import {
  calculateCartTotals,
  createCartLineKey,
  createCartStore,
  toCheckoutCartItems,
} from "@/lib/cart/cart-store";
import type { CartItemInput } from "@/lib/cart/cart-types";

const baseItem: CartItemInput = {
  productId: "11111111-1111-4111-8111-111111111111",
  slug: "test-product",
  title: "Тестовый товар",
  quantity: 1,
  unitPriceCents: 1200,
  currency: "EUR",
  orderMode: "priced",
};

describe("cart store", () => {
  it("builds stable line keys regardless of option order", () => {
    const first = createCartLineKey({
      ...baseItem,
      options: [
        { groupId: "g2", valueId: "v2", groupTitle: "B", valueTitle: "2" },
        { groupId: "g1", valueId: "v1", groupTitle: "A", valueTitle: "1" },
      ],
    });
    const second = createCartLineKey({
      ...baseItem,
      options: [
        { groupId: "g1", valueId: "v1", groupTitle: "A", valueTitle: "1" },
        { groupId: "g2", valueId: "v2", groupTitle: "B", valueTitle: "2" },
      ],
    });

    expect(first).toBe(second);
  });

  it("merges duplicate lines and clamps quantity", () => {
    const store = createCartStore();

    store.getState().addItem({ ...baseItem, quantity: 3 });
    store.getState().addItem({ ...baseItem, quantity: 30 });

    expect(store.getState().items).toHaveLength(1);
    expect(store.getState().items[0].quantity).toBe(20);
    expect(store.getState().totals.subtotalCents).toBe(24_000);
  });

  it("marks inquiry items as non-checkoutable", () => {
    const totals = calculateCartTotals([
      {
        ...baseItem,
        key: "line",
        orderMode: "inquiry_only",
        unitPriceCents: null,
      },
    ]);

    expect(totals.canCheckout).toBe(false);
    expect(totals.hasInquiryItems).toBe(true);
  });

  it("creates server checkout payload without browser pricing", () => {
    const store = createCartStore();
    store.getState().addItem({
      ...baseItem,
      variantId: "22222222-2222-4222-8222-222222222222",
      materialId: "33333333-3333-4333-8333-333333333333",
      options: [
        {
          groupId: "44444444-4444-4444-8444-444444444444",
          valueId: "55555555-5555-4555-8555-555555555555",
          groupTitle: "Размер",
          valueTitle: "M",
          priceDeltaCents: 500,
        },
      ],
    });

    expect(toCheckoutCartItems(store.getState().items)).toEqual([
      {
        productId: baseItem.productId,
        variantId: "22222222-2222-4222-8222-222222222222",
        materialId: "33333333-3333-4333-8333-333333333333",
        quantity: 1,
        options: [
          {
            groupId: "44444444-4444-4444-8444-444444444444",
            valueId: "55555555-5555-4555-8555-555555555555",
          },
        ],
      },
    ]);
  });
});
