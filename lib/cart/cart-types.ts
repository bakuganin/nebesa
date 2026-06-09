export type CartOrderMode = "priced" | "inquiry_only";

export type CartOptionSelection = {
  groupId: string;
  valueId: string;
  groupTitle: string;
  valueTitle: string;
  priceDeltaCents?: number;
};

export type CartItemInput = {
  productId: string;
  slug: string;
  title: string;
  imageUrl?: string | null;
  variantId?: string | null;
  variantTitle?: string | null;
  materialId?: string | null;
  materialTitle?: string | null;
  quantity: number;
  unitPriceCents?: number | null;
  currency: string;
  orderMode: CartOrderMode;
  options?: CartOptionSelection[];
};

export type CartLine = CartItemInput & {
  key: string;
  quantity: number;
};

export type CartTotals = {
  itemCount: number;
  subtotalCents: number;
  currency: string;
  canCheckout: boolean;
  hasInquiryItems: boolean;
};

export type CheckoutCartItem = {
  productId: string;
  variantId?: string;
  materialId?: string;
  quantity: number;
  options?: Array<{
    groupId: string;
    valueId: string;
  }>;
};
