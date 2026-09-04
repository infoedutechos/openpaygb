import "server-only";

import { createHmac } from "node:crypto";
import { prisma } from "@/lib/prisma";
import type { PartnerWebhookEvent } from "@/lib/developer-app";

function signBody(secret: string, body: string): string {
  return createHmac("sha256", secret).update(body, "utf8").digest("hex");
}

const MAX_DELIVERY_ATTEMPTS = 3;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Deliver merchant charge webhooks with the same 3× backoff used for tuition payment webhooks.
 */
export async function dispatchMerchantChargeWebhook(
  event: Extract<PartnerWebhookEvent, "charge.created" | "charge.confirmed" | "charge.failed">,
  charge: Record<string, unknown>,
  developerAppId: string,
): Promise<void> {
  const endpoints = await prisma.partnerWebhookEndpoint.findMany({
    where: {
      enabled: true,
      events: { has: event },
      OR: [{ developerAppId }, { developerAppId: null }],
    },
  });

  const payload = JSON.stringify({
    id: `evt_${Date.now()}`,
    type: event,
    createdAt: new Date().toISOString(),
    data: { charge },
  });

  await Promise.all(
    endpoints.map(async (ep) => {
      const sig = signBody(ep.secret, payload);
      let statusCode: number | null = null;
      let success = false;
      let error = "";

      for (let attempt = 1; attempt <= MAX_DELIVERY_ATTEMPTS; attempt++) {
        statusCode = null;
        success = false;
        error = "";
        try {
          const res = await fetch(ep.url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Odelhub-Event": event,
              "X-Odelhub-Signature": sig,
            },
            body: payload,
          });
          statusCode = res.status;
          success = res.ok;
          if (!res.ok) {
            error = await res.text().catch(() => `HTTP ${res.status}`);
          }
        } catch (e) {
          error = e instanceof Error ? e.message : "delivery error";
        }
        if (success) break;
        if (attempt < MAX_DELIVERY_ATTEMPTS) {
          await sleep(400 * attempt);
        }
      }

      await prisma.partnerWebhookDelivery.create({
        data: {
          endpointId: ep.id,
          event,
          paymentId: typeof charge.id === "string" ? charge.id : null,
          statusCode,
          success,
          error: error.slice(0, 500),
        },
      });
    }),
  );
}
