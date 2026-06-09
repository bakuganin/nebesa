import { createHmac } from "node:crypto";
import { describe, expect, test, vi, afterEach } from "vitest";

import {
  createWhatsAppFallbackUrl,
  formatOrderWhatsAppMessage,
  sendOrderWhatsAppNotification,
  sendWhatsAppText,
  verifyWhatsAppSignature,
} from "../../lib/whatsapp";
import { GET, POST } from "../../app/api/whatsapp/webhook/route";

const payload = JSON.stringify({
  object: "whatsapp_business_account",
  entry: [
    {
      id: "account-1",
      changes: [
        {
          field: "messages",
          value: {
            metadata: { phone_number_id: "phone-1" },
            messages: [{ id: "wamid.inbound", type: "text", from: "3725550000" }],
          },
        },
      ],
    },
  ],
});

function signatureFor(body: string, secret = "app-secret") {
  return `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`;
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("WhatsApp signature verification", () => {
  test("accepts a valid SHA-256 HMAC signature", () => {
    expect(verifyWhatsAppSignature(payload, signatureFor(payload), "app-secret")).toBe(true);
  });

  test("rejects missing, malformed, and tampered signatures", () => {
    expect(verifyWhatsAppSignature(payload, null, "app-secret")).toBe(false);
    expect(verifyWhatsAppSignature(payload, "bad-signature", "app-secret")).toBe(false);
    expect(verifyWhatsAppSignature(`${payload} `, signatureFor(payload), "app-secret")).toBe(false);
  });
});

describe("WhatsApp order messages", () => {
  test("formats an order summary for an operator", () => {
    const message = formatOrderWhatsAppMessage({
      orderNumber: "NBS-1001",
      customerName: "Иван Петров",
      customerPhone: "+372 5555 0000",
      customerEmail: "ivan@example.com",
      deliveryAddress: "Narva, Tallinna mnt 1",
      totalCents: 12950,
      currency: "EUR",
      items: [
        {
          name: "Венок классический",
          quantity: 2,
          unitPriceCents: 5000,
          options: ["Лента: светлая"],
        },
        {
          name: "Доставка",
          quantity: 1,
          unitPriceCents: 2950,
        },
      ],
      notes: "Позвонить до доставки",
    });

    expect(message).toContain("NEBESA: новый заказ");
    expect(message).toContain("NBS-1001");
    expect(message).toContain("Иван Петров");
    expect(message).toContain("+372 5555 0000");
    expect(message).toContain("2 x Венок классический");
    expect(message).toContain("129,50 EUR");
    expect(message).toContain("Позвонить до доставки");
  });

  test("builds a prefilled WhatsApp fallback URL", () => {
    const url = createWhatsAppFallbackUrl("+372 5555 0000", "NEBESA: новый заказ");

    expect(url).toBe("https://wa.me/37255550000?text=NEBESA%3A%20%D0%BD%D0%BE%D0%B2%D1%8B%D0%B9%20%D0%B7%D0%B0%D0%BA%D0%B0%D0%B7");
  });
});

describe("WhatsApp Cloud API sender", () => {
  test("sends a text message through the configured phone number", async () => {
    const fetcher = vi.fn(async () =>
      new Response(JSON.stringify({ messages: [{ id: "wamid.outbound" }] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    const result = await sendWhatsAppText(
      { to: "+372 5555 0000", message: "Test message" },
      {
        env: {
          WA_PHONE_NUMBER_ID: "phone-1",
          WA_ACCESS_TOKEN: "access-token",
        },
        fetcher,
      },
    );

    expect(result).toEqual({ status: "sent", providerMessageId: "wamid.outbound" });
    expect(fetcher).toHaveBeenCalledWith(
      "https://graph.facebook.com/v20.0/phone-1/messages",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          authorization: "Bearer access-token",
          "content-type": "application/json",
        }),
      }),
    );
  });

  test("returns a structured fallback status when Cloud API env is missing", async () => {
    const fetcher = vi.fn();

    const result = await sendOrderWhatsAppNotification(
      {
        orderNumber: "NBS-1002",
        customerName: "Мария",
        customerPhone: "+372 5555 1111",
        totalCents: 5000,
        currency: "EUR",
        items: [{ name: "Свеча", quantity: 1, unitPriceCents: 5000 }],
      },
      {
        env: { WA_TRUSTED_PHONE: "+372 5555 0000" },
        fetcher,
      },
    );

    expect(result.status).toBe("skipped");
    if (result.status !== "skipped") {
      throw new Error("Expected skipped WhatsApp result");
    }
    expect(result.reason).toBe("missing_cloud_api_config");
    expect(result.fallbackUrl).toContain("https://wa.me/37255550000?text=");
    expect(fetcher).not.toHaveBeenCalled();
  });

  test("does not throw on Graph API auth failure", async () => {
    const fetcher = vi.fn(async () =>
      new Response(JSON.stringify({ error: { message: "Invalid OAuth access token." } }), {
        status: 401,
        headers: { "content-type": "application/json" },
      }),
    );

    const result = await sendWhatsAppText(
      { to: "+372 5555 0000", message: "Test message" },
      {
        env: {
          WA_PHONE_NUMBER_ID: "phone-1",
          WA_ACCESS_TOKEN: "expired-token",
        },
        fetcher,
      },
    );

    expect(result.status).toBe("failed");
    if (result.status !== "failed") {
      throw new Error("Expected failed WhatsApp result");
    }
    expect(result.reason).toBe("graph_api_error");
    expect(result.httpStatus).toBe(401);
  });
});

describe("WhatsApp webhook route", () => {
  test("GET returns Meta challenge for the configured verify token", async () => {
    vi.stubEnv("WA_VERIFY_TOKEN", "verify-me");

    const response = await GET(
      new Request("https://nebesa.example/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=verify-me&hub.challenge=challenge-123"),
    );

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("challenge-123");
  });

  test("GET rejects invalid verify tokens", async () => {
    vi.stubEnv("WA_VERIFY_TOKEN", "verify-me");

    const response = await GET(
      new Request("https://nebesa.example/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=challenge-123"),
    );

    expect(response.status).toBe(403);
  });

  test("POST accepts a valid signed payload and reports skipped storage safely", async () => {
    vi.stubEnv("WA_APP_SECRET", "app-secret");

    const response = await POST(
      new Request("https://nebesa.example/api/whatsapp/webhook", {
        method: "POST",
        headers: { "x-hub-signature-256": signatureFor(payload) },
        body: payload,
      }),
    );

    expect(response.status).toBe(202);
    const body = await response.json();
    expect(body).toMatchObject({
      status: "accepted",
      storage: "skipped",
      eventType: "message",
    });
    expect(JSON.stringify(body)).not.toContain("app-secret");
  });

  test("POST rejects missing and invalid signatures before JSON parsing", async () => {
    vi.stubEnv("WA_APP_SECRET", "app-secret");

    const missing = await POST(
      new Request("https://nebesa.example/api/whatsapp/webhook", {
        method: "POST",
        body: "{not-json",
      }),
    );
    const invalid = await POST(
      new Request("https://nebesa.example/api/whatsapp/webhook", {
        method: "POST",
        headers: { "x-hub-signature-256": signatureFor(payload) },
        body: "{not-json",
      }),
    );

    expect(missing.status).toBe(401);
    expect(await missing.json()).toMatchObject({ error: "missing_signature" });
    expect(invalid.status).toBe(401);
    expect(await invalid.json()).toMatchObject({ error: "invalid_signature" });
  });

  test("POST fails closed when webhook secret is unavailable", async () => {
    const response = await POST(
      new Request("https://nebesa.example/api/whatsapp/webhook", {
        method: "POST",
        headers: { "x-hub-signature-256": signatureFor(payload) },
        body: payload,
      }),
    );

    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ error: "webhook_not_configured" });
  });
});
