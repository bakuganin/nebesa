import { afterEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createCheckoutOrder: vi.fn(),
  getCheckoutOrderWhatsAppSummary: vi.fn(),
  updateCheckoutNotificationFromWhatsAppResult: vi.fn(),
  sendOrderWhatsAppNotification: vi.fn(),
}));

vi.mock("@/features/orders/queries", () => ({
  createCheckoutOrder: mocks.createCheckoutOrder,
  getCheckoutOrderWhatsAppSummary: mocks.getCheckoutOrderWhatsAppSummary,
  updateCheckoutNotificationFromWhatsAppResult: mocks.updateCheckoutNotificationFromWhatsAppResult,
}));

vi.mock("@/lib/whatsapp", () => ({
  sendOrderWhatsAppNotification: mocks.sendOrderWhatsAppNotification,
}));

import { POST } from "@/app/api/checkout/route";

const validCheckoutPayload = {
  idempotencyKey: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  customer: {
    fullName: "Иван Иванов",
    phone: "+37255582200",
    email: "ivan@example.com",
    address: "Narva",
  },
  items: [
    {
      productId: "11111111-1111-4111-8111-111111111111",
      quantity: 1,
    },
  ],
  customerNote: "Позвонить перед доставкой",
};

afterEach(() => {
  vi.clearAllMocks();
});

describe("checkout route notification contract", () => {
  test("sends a WhatsApp notification after creating a new order without making delivery mandatory", async () => {
    const orderSummary = {
      orderNumber: "NEB-000001",
      customerName: "Иван Иванов",
      customerPhone: "+37255582200",
      customerEmail: "ivan@example.com",
      deliveryAddress: "Narva",
      totalCents: 12900,
      currency: "EUR",
      items: [{ name: "Венок", quantity: 1, unitPriceCents: 12900 }],
      notes: "Позвонить перед доставкой",
    };
    const notificationResult = {
      status: "skipped",
      reason: "missing_cloud_api_config",
      fallbackUrl: "https://wa.me/37256342741?text=NEBESA",
    } as const;

    mocks.createCheckoutOrder.mockResolvedValue({
      order_id: "99999999-9999-4999-8999-999999999999",
      order_reference: "NEB-000001",
      total_cents: 12900,
      currency: "EUR",
      reused: false,
    });
    mocks.getCheckoutOrderWhatsAppSummary.mockResolvedValue(orderSummary);
    mocks.sendOrderWhatsAppNotification.mockResolvedValue(notificationResult);
    mocks.updateCheckoutNotificationFromWhatsAppResult.mockResolvedValue(undefined);

    const response = await POST(
      new Request("https://nebesa.example/api/checkout", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": "203.0.113.10",
        },
        body: JSON.stringify(validCheckoutPayload),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      orderId: "99999999-9999-4999-8999-999999999999",
      orderReference: "NEB-000001",
      notificationStatus: "skipped",
      whatsappFallbackUrl: "https://wa.me/37256342741?text=NEBESA",
    });
    expect(mocks.getCheckoutOrderWhatsAppSummary).toHaveBeenCalledWith("99999999-9999-4999-8999-999999999999");
    expect(mocks.sendOrderWhatsAppNotification).toHaveBeenCalledWith(orderSummary);
    expect(mocks.updateCheckoutNotificationFromWhatsAppResult).toHaveBeenCalledWith(
      "99999999-9999-4999-8999-999999999999",
      notificationResult,
    );
  });
});
