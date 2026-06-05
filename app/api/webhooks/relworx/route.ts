import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { confirmRelworxPaymentIfEligible } from "@/lib/relworx/confirm-payment";
import { relworxCustomerReference } from "@/lib/relworx/client";
import { relworxWebhookAuthorized } from "@/lib/relworx/verify-webhook-signature";
import { getRelworxWebhookUrl } from "@/lib/relworx/webhook-url";
import { clientIp, rateLimitHit } from "@/lib/rate-limit";
import { apiErrorResponse } from "@/lib/api-error";
import { requireConfiguredSecret } from "@/lib/production-secrets";
import { withPrismaRetry } from "@/lib/prisma-retry";

export function GET() {
  return new NextResponse("OK", { status: 200 });
}

/**
 * Relworx MoMo webhooks — https://payments.relworx.com/docs/webhooks/
 * Match pending payments by `customer_reference` (payment id).
 */
export async function POST(req: Request) {
  try {
    const { warmDeploymentEnvCache, deploymentEnv } = await import("@/lib/deployment-env-resolve");
    await warmDeploymentEnvCache();
    const secret = deploymentEnv("RELWORX_WEBHOOK_KEY") || deploymentEnv("RELWORX_WEBHOOK_SECRET");
    const secretCheck = requireConfiguredSecret("RELWORX_WEBHOOK_KEY", secret);
    if (!secretCheck.ok) return secretCheck.response;

    if (rateLimitHit(`relworx-hook:${clientIp(req)}`, 120, 60_000)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const rawBody = await req.text();
    let body: unknown;
    try {
      body = JSON.parse(rawBody) as unknown;
    } catch {
      return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
    }

    if (body === null || typeof body !== "object") {
      return NextResponse.json({ ok: false, error: "Expected JSON body" }, { status: 400 });
    }

    const payload = body as Record<string, unknown>;
    const status = typeof payload.status === "string" ? payload.status : "";
    const customer_reference =
      (typeof payload.customer_reference === "string" && payload.customer_reference) || "";
    const internal_reference =
      typeof payload.internal_reference === "string" ? payload.internal_reference : "";

    const auth = relworxWebhookAuthorized(req, {
      status,
      customer_reference,
      internal_reference,
    });
    if (!auth.ok) {
      const hint = getRelworxWebhookUrl()
        ? "Check RELWORX_WEBHOOK_KEY and that the dashboard webhook URL matches RELWORX_WEBHOOK_URL or NEXT_PUBLIC_APP_URL."
        : "Set NEXT_PUBLIC_APP_URL or RELWORX_WEBHOOK_URL for signature verification.";
      return NextResponse.json({ error: "Unauthorized", hint }, { status: 401 });
    }

    const ref = relworxCustomerReference(customer_reference.trim());
    if (!ref) {
      return NextResponse.json({ ok: true, action: "no_reference" });
    }

    const internal = internal_reference.trim();
    const payment = await withPrismaRetry(() =>
      prisma.payment.findFirst({
        where: {
          rail: "relworx",
          OR: [{ id: ref }, ...(internal ? [{ momoReference: internal }] : [])],
        },
      }),
    );

    if (!payment) {
      return NextResponse.json({ ok: true, action: "unknown_reference", reference: ref });
    }

    const result = await confirmRelworxPaymentIfEligible(payment, {
      status: payload.status,
      request_status: payload.request_status,
      amount: payload.amount,
      currency: payload.currency,
      internal_reference: payload.internal_reference,
      customer_reference,
    });

    return NextResponse.json({
      ok: true,
      action: result.action,
      ...(result.paymentId ? { paymentId: result.paymentId } : {}),
    });
  } catch (e) {
    return apiErrorResponse(e, { route: "webhooks/relworx", fallback: "Webhook processing failed" });
  }
}
