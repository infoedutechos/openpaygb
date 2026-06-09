import { NextResponse } from "next/server";
import { deploymentEnv, warmDeploymentEnvCache } from "@/lib/deployment-env-resolve";
import { prisma } from "@/lib/prisma";
import { withPrismaRetry } from "@/lib/prisma-retry";
import { vixonPayMerchantReference } from "@/lib/vixonpay/client";
import { confirmVixonPayPaymentIfEligible } from "@/lib/vixonpay/confirm-payment";
import { confirmOpenPayCardTopupFromVixonPay } from "@/lib/openpay-card-momo-topup";
import { vixonPayWebhookAuthorized } from "@/lib/vixonpay/verify-webhook-signature";
import { getVixonPayWebhookUrl } from "@/lib/vixonpay/webhook-url";
import { clientIp, rateLimitHit } from "@/lib/rate-limit";
import { apiErrorResponse } from "@/lib/api-error";
import { requireConfiguredSecret } from "@/lib/production-secrets";

export function GET() {
  return new NextResponse("OK", { status: 200 });
}

/**
 * VixonPay transaction webhooks — https://docs.vixonpay.com/pay
 * Matches OpenPay card top-ups by `merchant_reference` (top-up id).
 */
export async function POST(req: Request) {
  try {
    await warmDeploymentEnvCache();

    const secretCheck = requireConfiguredSecret(
      "VIXONPAY_WEBHOOK_SECRET",
      deploymentEnv("VIXONPAY_WEBHOOK_SECRET"),
    );
    if (!secretCheck.ok) return secretCheck.response;

    if (rateLimitHit(`vixonpay-hook:${clientIp(req)}`, 120, 60_000)) {
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

    const auth = vixonPayWebhookAuthorized(req, rawBody);
    if (!auth.ok) {
      const hint = getVixonPayWebhookUrl()
        ? "Check VIXONPAY_WEBHOOK_SECRET and that the dashboard webhook URL matches VIXONPAY_WEBHOOK_URL or NEXT_PUBLIC_APP_URL."
        : "Set NEXT_PUBLIC_APP_URL or VIXONPAY_WEBHOOK_URL for webhook configuration.";
      return NextResponse.json({ error: "Unauthorized", hint }, { status: 401 });
    }

    const payload = body as Record<string, unknown>;
    const event = typeof payload.event === "string" ? payload.event : "";
    const data =
      payload.data !== null && typeof payload.data === "object"
        ? (payload.data as Record<string, unknown>)
        : null;

    if (!data) {
      return NextResponse.json({ ok: true, action: "no_data" });
    }

    const merchantReference =
      (typeof data.merchant_reference === "string" && data.merchant_reference.trim()) || "";
    const ref = vixonPayMerchantReference(merchantReference);
    if (!ref) {
      return NextResponse.json({ ok: true, action: "no_reference", event });
    }

    const topupResult = await confirmOpenPayCardTopupFromVixonPay(ref, {
      event,
      transaction_status: data.transaction_status,
      transaction_amount: data.transaction_amount,
      request_currency: data.request_currency,
      internal_reference: data.internal_reference,
    });
    if (topupResult.action === "card_topup_confirmed" || topupResult.action === "already_confirmed") {
      return NextResponse.json({ ok: true, action: topupResult.action, event, cardTopupId: ref });
    }

    const payment = await withPrismaRetry(
      () =>
        prisma.payment.findFirst({
          where: {
            OR: [{ id: ref }, { momoReference: ref }],
            rail: "vixonpay",
          },
        }),
      { attempts: 2, baseDelayMs: 150 },
    );
    if (!payment) {
      return NextResponse.json({
        ok: true,
        action: topupResult.action !== "unknown_topup" ? topupResult.action : "unknown_reference",
        event,
        reference: ref,
      });
    }

    const result = await confirmVixonPayPaymentIfEligible(payment, {
      transaction_status: data.transaction_status,
      transaction_amount: data.transaction_amount,
      request_currency: data.request_currency,
      internal_reference: data.internal_reference,
      merchant_reference: data.merchant_reference,
    });

    return NextResponse.json({
      ok: true,
      action: result.action,
      event,
      ...(result.paymentId ? { paymentId: result.paymentId } : {}),
    });
  } catch (e) {
    return apiErrorResponse(e, { route: "webhooks/vixonpay", fallback: "Webhook processing failed" });
  }
}
