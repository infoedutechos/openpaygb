import { NextResponse } from "next/server";
import { deploymentEnv, warmDeploymentEnvCache } from "@/lib/deployment-env-resolve";
import { prisma } from "@/lib/prisma";

import { livePayCustomerReference } from "@/lib/livepay/client";

import { confirmLivePayPaymentIfEligible } from "@/lib/livepay/confirm-payment";

import { livePayWebhookAuthorized } from "@/lib/livepay/verify-webhook-signature";

import { getLivePayWebhookUrl } from "@/lib/livepay/webhook-url";

import { clientIp, rateLimitHit } from "@/lib/rate-limit";

import { apiErrorResponse } from "@/lib/api-error";

import { requireConfiguredSecret } from "@/lib/production-secrets";

import { withPrismaRetry } from "@/lib/prisma-retry";



export function GET() {

  return new NextResponse("OK", { status: 200 });

}



/**

 * LivePay transaction webhooks — https://docs.livepay.me/webhooks

 * Matches pending payments by `customer_reference` (payment id).

 */

export async function POST(req: Request) {

  try {

    await warmDeploymentEnvCache();

    const secretCheck = requireConfiguredSecret(

      "LIVEPAY_WEBHOOK_SECRET",

      deploymentEnv("LIVEPAY_WEBHOOK_SECRET"),

    );

    if (!secretCheck.ok) return secretCheck.response;



    if (rateLimitHit(`livepay-hook:${clientIp(req)}`, 120, 60_000)) {

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

      (typeof payload.customer_reference === "string" && payload.customer_reference) ||

      (typeof payload.reference === "string" && payload.reference) ||

      "";

    const internal_reference =

      typeof payload.internal_reference === "string" ? payload.internal_reference : "";



    const auth = livePayWebhookAuthorized(req, {

      status,

      customer_reference,

      internal_reference,

    });

    if (!auth.ok) {

      const hint = getLivePayWebhookUrl()

        ? "Check LIVEPAY_WEBHOOK_SECRET and that the dashboard webhook URL matches LIVEPAY_WEBHOOK_URL or NEXT_PUBLIC_APP_URL."

        : "Set NEXT_PUBLIC_APP_URL or LIVEPAY_WEBHOOK_URL for signature verification.";

      return NextResponse.json({ error: "Unauthorized", hint }, { status: 401 });

    }



    const ref = livePayCustomerReference(customer_reference.trim());

    if (!ref) {

      return NextResponse.json({ ok: true, action: "no_reference" });

    }



    const payment = await withPrismaRetry(() =>

      prisma.payment.findFirst({

        where: {

          OR: [{ id: ref }, { momoReference: ref }],

          rail: "livepay",

        },

      }),

    );

    if (!payment) {

      return NextResponse.json({ ok: true, action: "unknown_reference", reference: ref });

    }



    const result = await confirmLivePayPaymentIfEligible(payment, {

      status: payload.status,

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

    return apiErrorResponse(e, { route: "webhooks/livepay", fallback: "Webhook processing failed" });

  }

}


