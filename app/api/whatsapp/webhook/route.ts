import { NextResponse } from "next/server";

import {
  storeWhatsAppWebhookPayload,
  summarizeWhatsAppWebhookPayload,
  verifyWhatsAppSignature,
} from "../../../../lib/whatsapp";

export const runtime = "nodejs";

function jsonResponse(body: Record<string, unknown>, status: number) {
  return NextResponse.json(body, {
    status,
    headers: {
      "cache-control": "no-store",
    },
  });
}

function envValue(key: string) {
  const value = process.env[key];
  return value && value.trim().length > 0 ? value.trim() : undefined;
}

export async function GET(request: Request) {
  const verifyToken = envValue("WA_VERIFY_TOKEN");

  if (!verifyToken) {
    return jsonResponse({ error: "webhook_not_configured" }, 503);
  }

  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const requestToken = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (mode !== "subscribe" || !challenge) {
    return jsonResponse({ error: "invalid_verification_request" }, 400);
  }

  if (requestToken !== verifyToken) {
    return jsonResponse({ error: "invalid_verify_token" }, 403);
  }

  return new Response(challenge, {
    status: 200,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

export async function POST(request: Request) {
  const appSecret = envValue("WA_APP_SECRET");

  if (!appSecret) {
    return jsonResponse({ error: "webhook_not_configured" }, 503);
  }

  const signature = request.headers.get("x-hub-signature-256");
  const rawBody = await request.text();

  if (!signature) {
    return jsonResponse({ error: "missing_signature" }, 401);
  }

  if (!verifyWhatsAppSignature(rawBody, signature, appSecret)) {
    return jsonResponse({ error: "invalid_signature" }, 401);
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return jsonResponse({ error: "invalid_json" }, 400);
  }

  const summary = summarizeWhatsAppWebhookPayload(payload);
  const storage = await storeWhatsAppWebhookPayload(payload, summary);

  return jsonResponse(
    {
      status: "accepted",
      storage: storage.status,
      eventType: summary.eventType,
      direction: summary.direction,
    },
    202,
  );
}
