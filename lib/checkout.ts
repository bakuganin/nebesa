import { z } from "zod";

import type { CheckoutOrderInput } from "@/features/orders/queries";

export const checkoutLimits = {
  maxPayloadBytes: 20_000,
  maxItems: 40,
  maxQuantity: 20,
  rateLimitWindowMs: 60_000,
  rateLimitMaxRequests: 10,
} as const;

const uuidSchema = z.string().uuid();

export const checkoutRequestSchema = z.object({
  idempotencyKey: z.string().uuid(),
  customer: z.object({
    fullName: z.string().trim().min(2).max(120),
    phone: z.string().trim().min(5).max(40),
    email: z.string().trim().email().max(160).optional().or(z.literal("")),
    address: z.string().trim().max(300).optional().or(z.literal("")),
  }),
  items: z
    .array(
      z.object({
        productId: uuidSchema,
        orderMode: z.enum(["priced", "inquiry_only"]).default("priced"),
        variantId: uuidSchema.optional(),
        materialId: uuidSchema.optional(),
        quantity: z.coerce.number().int().min(1).max(checkoutLimits.maxQuantity),
        options: z
          .array(
            z.object({
              groupId: uuidSchema,
              valueId: uuidSchema,
            }),
          )
          .max(20)
          .optional(),
      }),
    )
    .min(1)
    .max(checkoutLimits.maxItems),
  customerNote: z.string().trim().max(1000).optional().or(z.literal("")),
});

export type CheckoutRequest = z.infer<typeof checkoutRequestSchema>;

export type CheckoutRateLimitResult = {
  allowed: boolean;
  retryAfterSeconds: number;
};

const checkoutBuckets = new Map<string, { count: number; resetAt: number }>();

export function checkCheckoutRateLimit(
  key: string,
  now = Date.now(),
): CheckoutRateLimitResult {
  const bucketKey = key || "anonymous";
  const existing = checkoutBuckets.get(bucketKey);

  if (!existing || existing.resetAt <= now) {
    checkoutBuckets.set(bucketKey, {
      count: 1,
      resetAt: now + checkoutLimits.rateLimitWindowMs,
    });

    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (existing.count >= checkoutLimits.rateLimitMaxRequests) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }

  existing.count += 1;
  checkoutBuckets.set(bucketKey, existing);
  return { allowed: true, retryAfterSeconds: 0 };
}

export function toCheckoutOrderInput(
  request: CheckoutRequest,
  requestContext: Record<string, unknown> = {},
): CheckoutOrderInput {
  return {
    idempotencyKey: request.idempotencyKey,
    customer: {
      fullName: request.customer.fullName,
      phone: request.customer.phone,
      email: request.customer.email || undefined,
      address: request.customer.address || undefined,
    },
    items: request.items.map((item) => ({
      productId: item.productId,
      orderMode: item.orderMode,
      variantId: item.variantId,
      materialId: item.materialId,
      quantity: item.quantity,
      options: item.options,
    })),
    customerNote: request.customerNote || undefined,
    requestContext,
  };
}

export function isMissingEnvError(error: unknown): boolean {
  return error instanceof Error && error.message.startsWith("Missing required environment variable:");
}
