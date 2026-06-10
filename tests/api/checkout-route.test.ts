import { afterEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createCheckoutOrder: vi.fn(),
  getCheckoutOrderWhatsAppSummary: vi.fn(),
  updateCheckoutNotificationFromEmailResult: vi.fn(),
  updateCheckoutNotificationFromWhatsAppResult: vi.fn(),
  updateCheckoutOrderNotificationStatus: vi.fn(),
  sendOrderEmailNotification: vi.fn(),
  sendOrderWhatsAppNotification: vi.fn(),
}));

vi.mock("@/features/orders/queries", () => ({
  createCheckoutOrder: mocks.createCheckoutOrder,
  getCheckoutOrderWhatsAppSummary: mocks.getCheckoutOrderWhatsAppSummary,
  updateCheckoutNotificationFromEmailResult: mocks.updateCheckoutNotificationFromEmailResult,
  updateCheckoutNotificationFromWhatsAppResult: mocks.updateCheckoutNotificationFromWhatsAppResult,
  updateCheckoutOrderNotificationStatus: mocks.updateCheckoutOrderNotificationStatus,
}));

vi.mock("@/lib/email", () => ({
  sendOrderEmailNotification: mocks.sendOrderEmailNotification,
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
    mocks.sendOrderEmailNotification.mockResolvedValue({
      status: "skipped",
      reason: "missing_resend_config",
    });
    mocks.updateCheckoutNotificationFromEmailResult.mockResolvedValue(undefined);
    mocks.updateCheckoutOrderNotificationStatus.mockResolvedValue(undefined);

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
      whatsappNotificationStatus: "skipped",
      emailNotificationStatus: "skipped",
      whatsappFallbackUrl: "https://wa.me/37256342741?text=NEBESA",
    });
    expect(mocks.getCheckoutOrderWhatsAppSummary).toHaveBeenCalledWith("99999999-9999-4999-8999-999999999999");
    expect(mocks.sendOrderWhatsAppNotification).toHaveBeenCalledWith(orderSummary);
    expect(mocks.updateCheckoutNotificationFromWhatsAppResult).toHaveBeenCalledWith(
      "99999999-9999-4999-8999-999999999999",
      notificationResult,
    );
    expect(mocks.sendOrderEmailNotification).toHaveBeenCalledWith(orderSummary);
    expect(mocks.updateCheckoutNotificationFromEmailResult).toHaveBeenCalledWith(
      "99999999-9999-4999-8999-999999999999",
      { status: "skipped", reason: "missing_resend_config" },
    );
    expect(mocks.updateCheckoutOrderNotificationStatus).toHaveBeenCalledWith(
      "99999999-9999-4999-8999-999999999999",
      "skipped",
    );
  });

  test("marks the order notification status as sent when email succeeds after WhatsApp is skipped", async () => {
    const orderSummary = {
      orderNumber: "NEB-000002",
      customerName: "Иван Иванов",
      customerPhone: "+37255582200",
      totalCents: 0,
      currency: "EUR",
      items: [{ name: "Памятник", quantity: 1, unitPriceCents: 0 }],
    };

    mocks.createCheckoutOrder.mockResolvedValue({
      order_id: "88888888-8888-4888-8888-888888888888",
      order_reference: "NEB-000002",
      total_cents: 0,
      currency: "EUR",
      reused: false,
    });
    mocks.getCheckoutOrderWhatsAppSummary.mockResolvedValue(orderSummary);
    mocks.sendOrderWhatsAppNotification.mockResolvedValue({
      status: "skipped",
      reason: "missing_cloud_api_config",
    });
    mocks.updateCheckoutNotificationFromWhatsAppResult.mockResolvedValue(undefined);
    mocks.sendOrderEmailNotification.mockResolvedValue({
      status: "sent",
      providerMessageId: "email-1",
    });
    mocks.updateCheckoutNotificationFromEmailResult.mockResolvedValue(undefined);
    mocks.updateCheckoutOrderNotificationStatus.mockResolvedValue(undefined);

    const response = await POST(
      new Request("https://nebesa.example/api/checkout", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": "203.0.113.11",
        },
        body: JSON.stringify({
          ...validCheckoutPayload,
          idempotencyKey: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
          items: [
            {
              productId: "22222222-2222-4222-8222-222222222222",
              orderMode: "inquiry_only",
              quantity: 1,
            },
          ],
        }),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      orderReference: "NEB-000002",
      notificationStatus: "sent",
      whatsappNotificationStatus: "skipped",
      emailNotificationStatus: "sent",
    });
    expect(mocks.updateCheckoutOrderNotificationStatus).toHaveBeenCalledWith(
      "88888888-8888-4888-8888-888888888888",
      "sent",
    );
  });

  test("marks both notification channels failed when the order summary cannot be loaded", async () => {
    mocks.createCheckoutOrder.mockResolvedValue({
      order_id: "77777777-7777-4777-8777-777777777777",
      order_reference: "NEB-000003",
      total_cents: 0,
      currency: "EUR",
      reused: false,
    });
    mocks.getCheckoutOrderWhatsAppSummary.mockRejectedValue(new Error("summary unavailable"));
    mocks.updateCheckoutNotificationFromWhatsAppResult.mockResolvedValue(undefined);
    mocks.updateCheckoutNotificationFromEmailResult.mockResolvedValue(undefined);
    mocks.updateCheckoutOrderNotificationStatus.mockResolvedValue(undefined);

    const response = await POST(
      new Request("https://nebesa.example/api/checkout", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": "203.0.113.12",
        },
        body: JSON.stringify({
          ...validCheckoutPayload,
          idempotencyKey: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
        }),
      }),
    );

    const failedResult = { status: "failed", reason: "network_error" };

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      orderReference: "NEB-000003",
      notificationStatus: "failed",
      whatsappNotificationStatus: "failed",
      emailNotificationStatus: "failed",
    });
    expect(mocks.sendOrderWhatsAppNotification).not.toHaveBeenCalled();
    expect(mocks.sendOrderEmailNotification).not.toHaveBeenCalled();
    expect(mocks.updateCheckoutNotificationFromWhatsAppResult).toHaveBeenCalledWith(
      "77777777-7777-4777-8777-777777777777",
      failedResult,
    );
    expect(mocks.updateCheckoutNotificationFromEmailResult).toHaveBeenCalledWith(
      "77777777-7777-4777-8777-777777777777",
      failedResult,
    );
    expect(mocks.updateCheckoutOrderNotificationStatus).toHaveBeenCalledWith(
      "77777777-7777-4777-8777-777777777777",
      "failed",
    );
  });
});
