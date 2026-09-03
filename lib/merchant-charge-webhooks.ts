import "server-only";

import { createHmac } from "node:crypto";
import { prisma } from "@/lib/prisma";
import type { PartnerWebhookEvent } from "@/lib/developer-app";

function signBody(secret: string, body: string): string {
  return createHmac("sha256", secret).update(body, "utf8").digest("hex");
}

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
      try {
        const sig = signBody(ep.secret, payload);
        const res = await fetch(ep.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Odelhub-Event": event,
            "X-Odelhub-Signature": sig,
          },
          body: payload,
        });
        await prisma.partnerWebhookDelivery.create({
          data: {
            endpointId: ep.id,
            event,
            paymentId: typeof charge.id === "string" ? charge.id : null,
            statusCode: res.status,
            success: res.ok,
            error: res.ok ? "" : await res.text().catch(() => "delivery failed"),
          },
        });
      } catch (e) {
        await prisma.partnerWebhookDelivery.create({
          data: {
            endpointId: ep.id,
            event,
            paymentId: typeof charge.id === "string" ? charge.id : null,
            success: false,
            error: e instanceof Error ? e.message : "delivery error",
          },
        });
      }
    }),
  );
}
