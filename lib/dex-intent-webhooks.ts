import "server-only";

import { createHmac } from "node:crypto";
import { prisma } from "@/lib/prisma";
import type { PartnerWebhookEvent } from "@/lib/developer-app";

function signBody(secret: string, body: string): string {
  return createHmac("sha256", secret).update(body, "utf8").digest("hex");
}

export async function dispatchDexIntentWebhook(
  event: Extract<PartnerWebhookEvent, "dex.intent.created" | "dex.intent.completed">,
  intent: Record<string, unknown>,
): Promise<void> {
  const developerAppId =
    typeof intent.id === "string"
      ? (
          await prisma.dexPaymentIntent.findUnique({
            where: { id: intent.id as string },
            select: { developerAppId: true },
          })
        )?.developerAppId
      : null;

  const endpoints = await prisma.partnerWebhookEndpoint.findMany({
    where: {
      enabled: true,
      events: { has: event },
      ...(developerAppId ? { developerAppId } : {}),
    },
  });

  const payload = JSON.stringify({ event, intent, sentAt: new Date().toISOString() });

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
            paymentId: null,
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
            success: false,
            error: e instanceof Error ? e.message : "delivery error",
          },
        });
      }
    }),
  );
}
