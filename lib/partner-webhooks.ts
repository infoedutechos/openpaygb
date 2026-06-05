import { createHmac } from "node:crypto";
import type { Payment } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { loadPartnerProgrammeContext, paymentToPartnerPayload } from "@/lib/mobile-money-provider-webhook";

export type PartnerWebhookEvent = "payment.confirmed" | "payment.failed";

export function signPartnerWebhookPayload(secret: string, rawBody: string): string {
  return createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
}

const MAX_DELIVERY_ATTEMPTS = 3;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function deliverOne(
  endpoint: { id: string; url: string; secret: string },
  event: PartnerWebhookEvent,
  payload: Record<string, unknown>,
): Promise<void> {
  const body = JSON.stringify({
    id: `evt_${Date.now()}`,
    type: event,
    createdAt: new Date().toISOString(),
    data: payload,
  });
  const signature = signPartnerWebhookPayload(endpoint.secret, body);

  let statusCode: number | null = null;
  let success = false;
  let error = "";

  for (let attempt = 1; attempt <= MAX_DELIVERY_ATTEMPTS; attempt++) {
    statusCode = null;
    success = false;
    error = "";
    try {
      const res = await fetch(endpoint.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Odelhub-Signature": signature,
          "X-Odelhub-Event": event,
        },
        body,
      });
      statusCode = res.status;
      success = res.ok;
      if (!res.ok) {
        error = await res.text().catch(() => `HTTP ${res.status}`);
      }
    } catch (e) {
      error = e instanceof Error ? e.message : "delivery_failed";
    }
    if (success) break;
    if (attempt < MAX_DELIVERY_ATTEMPTS) {
      await sleep(400 * attempt);
    }
  }

  await prisma.partnerWebhookDelivery.create({
    data: {
      endpointId: endpoint.id,
      event,
      paymentId: typeof payload.payment === "object" && payload.payment && "id" in (payload.payment as object)
        ? String((payload.payment as { id: string }).id)
        : null,
      statusCode,
      success,
      error: error.slice(0, 500),
    },
  });
}

/** Fire-and-forget outbound partner webhooks for a payment event. */
export function enqueuePartnerWebhooks(
  event: PartnerWebhookEvent,
  payment: Payment & { organization?: { slug: string; name: string } },
): void {
  void dispatchPartnerWebhooks(event, payment).catch((e) => console.error("[partner-webhook]", e));
}

async function dispatchPartnerWebhooks(
  event: PartnerWebhookEvent,
  payment: Payment & { organization?: { slug: string; name: string } },
): Promise<void> {
  const endpoints = await prisma.partnerWebhookEndpoint.findMany({
    where: {
      enabled: true,
      events: { has: event },
      OR: [{ organizationId: null }, { organizationId: payment.organizationId }],
    },
    select: { id: true, url: true, secret: true },
  });

  if (endpoints.length === 0) return;

  /** Webhooks include programme duration + per-student completion progress so partner systems can route on it. */
  const context = await loadPartnerProgrammeContext(payment);
  const payload = { payment: paymentToPartnerPayload(payment, context) };

  await Promise.all(endpoints.map((ep) => deliverOne(ep, event, payload)));
}
