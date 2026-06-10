import { describe, expect, test, vi } from "vitest";

import { formatOrderEmailText, sendOrderEmailNotification } from "@/lib/email";

const orderSummary = {
  orderNumber: "NEB-000003",
  customerName: "Анна",
  customerPhone: "+37255582200",
  customerEmail: "anna@example.com",
  deliveryAddress: "Tallinn",
  totalCents: 12900,
  currency: "EUR",
  items: [
    { name: "Венок", quantity: 1, unitPriceCents: 12900, totalPriceCents: 12900 },
    { name: "Памятник", quantity: 1, unitPriceCents: 0, totalPriceCents: 0 },
  ],
  notes: "Перезвонить утром",
};

describe("order email notification", () => {
  test("formats priced and request-only items for an operator", () => {
    const message = formatOrderEmailText(orderSummary);

    expect(message).toContain("NEBESA: новая заявка");
    expect(message).toContain("Заказ: NEB-000003");
    expect(message).toContain("Венок: 129,00 EUR");
    expect(message).toContain("Памятник: цена по запросу");
    expect(message).toContain("Перезвонить утром");
  });

  test("skips safely when email provider config is incomplete", async () => {
    const fetcher = vi.fn();

    await expect(
      sendOrderEmailNotification(orderSummary, {
        env: {
          ORDER_EMAIL_FROM: "NEBESA <orders@example.com>",
          ORDER_EMAIL_TO: "operator@example.com",
        },
        fetcher,
      }),
    ).resolves.toEqual({ status: "skipped", reason: "missing_resend_config" });
    expect(fetcher).not.toHaveBeenCalled();
  });

  test("sends a plain-text order email through Resend", async () => {
    const fetcher = vi.fn(async () =>
      new Response(JSON.stringify({ id: "email-1" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    const result = await sendOrderEmailNotification(orderSummary, {
      env: {
        RESEND_API_KEY: "resend-token",
        ORDER_EMAIL_FROM: "NEBESA <orders@example.com>",
        ORDER_EMAIL_TO: "operator@example.com, owner@example.com",
      },
      fetcher,
    });

    expect(result).toEqual({ status: "sent", providerMessageId: "email-1" });
    expect(fetcher).toHaveBeenCalledWith(
      "https://api.resend.com/emails",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          authorization: "Bearer resend-token",
          "content-type": "application/json",
        }),
      }),
    );
  });
});
