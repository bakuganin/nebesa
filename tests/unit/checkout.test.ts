import { describe, expect, it } from "vitest";

import {
  checkCheckoutRateLimit,
  checkoutLimits,
  checkoutRequestSchema,
  toCheckoutOrderInput,
} from "@/lib/checkout";

const validCheckout = {
  idempotencyKey: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  customer: {
    fullName: "Иван Иванов",
    phone: "+37255582200",
    email: "client@example.com",
    address: "Narva",
  },
  items: [
    {
      productId: "11111111-1111-4111-8111-111111111111",
      quantity: 2,
      options: [
        {
          groupId: "22222222-2222-4222-8222-222222222222",
          valueId: "33333333-3333-4333-8333-333333333333",
        },
      ],
    },
  ],
  customerNote: "Комментарий",
};

describe("checkout validation", () => {
  it("accepts the canonical checkout payload", () => {
    const parsed = checkoutRequestSchema.safeParse(validCheckout);
    expect(parsed.success).toBe(true);

    if (parsed.success) {
      expect(toCheckoutOrderInput(parsed.data).items[0]).toEqual({
        productId: "11111111-1111-4111-8111-111111111111",
        variantId: undefined,
        materialId: undefined,
        quantity: 2,
        options: [
          {
            groupId: "22222222-2222-4222-8222-222222222222",
            valueId: "33333333-3333-4333-8333-333333333333",
          },
        ],
      });
    }
  });

  it("rejects oversized item quantities", () => {
    const parsed = checkoutRequestSchema.safeParse({
      ...validCheckout,
      items: [{ ...validCheckout.items[0], quantity: checkoutLimits.maxQuantity + 1 }],
    });

    expect(parsed.success).toBe(false);
  });

  it("limits repeated checkout attempts per key", () => {
    const now = Date.now();
    const key = `test-${now}`;

    for (let index = 0; index < checkoutLimits.rateLimitMaxRequests; index += 1) {
      expect(checkCheckoutRateLimit(key, now).allowed).toBe(true);
    }

    expect(checkCheckoutRateLimit(key, now).allowed).toBe(false);
    expect(checkCheckoutRateLimit(key, now + checkoutLimits.rateLimitWindowMs + 1).allowed).toBe(true);
  });
});
