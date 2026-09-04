/**
 * Bank-card acquiring (Flutterwave / Paystack) — opt-in via env.
 * Closed-loop OpenPayGB wallet remains PaymentRail.openpay_card.
 */

import { deploymentEnv } from "@/lib/deployment-env-resolve";

export type CardAcquiringProvider = "flutterwave" | "paystack" | null;

export function cardAcquiringProvider(): CardAcquiringProvider {
  const p = deploymentEnv("CARD_ACQUIRING_PROVIDER").toLowerCase();
  if (p === "flutterwave" || p === "paystack") return p;
  if (deploymentEnv("FLUTTERWAVE_SECRET_KEY")) return "flutterwave";
  if (deploymentEnv("PAYSTACK_SECRET_KEY")) return "paystack";
  return null;
}

export function isCardAcquiringConfigured(): boolean {
  const p = cardAcquiringProvider();
  if (p === "flutterwave") return Boolean(deploymentEnv("FLUTTERWAVE_SECRET_KEY"));
  if (p === "paystack") return Boolean(deploymentEnv("PAYSTACK_SECRET_KEY"));
  return false;
}

export function cardAcquiringNotConfiguredMessage(): string {
  return "Card acquiring is not configured. Set CARD_ACQUIRING_PROVIDER=flutterwave|paystack and the matching secret key.";
}

export type CardCheckoutSessionInput = {
  paymentId: string;
  amountUgx: number;
  email: string;
  customerName?: string;
  redirectUrl: string;
  currency?: string;
};

export type CardCheckoutSessionResult = {
  provider: "flutterwave" | "paystack";
  authorizationUrl: string;
  providerReference: string;
};

/** Create a hosted card checkout session with the configured acquirer. */
export async function createCardCheckoutSession(
  input: CardCheckoutSessionInput,
): Promise<CardCheckoutSessionResult> {
  const provider = cardAcquiringProvider();
  if (!provider || !isCardAcquiringConfigured()) {
    throw new Error(cardAcquiringNotConfiguredMessage());
  }

  const currency = (input.currency || "UGX").toUpperCase();
  const amount = Math.round(input.amountUgx);
  const txRef = `opgb_${input.paymentId}`.replace(/[^a-zA-Z0-9_]/g, "").slice(0, 50);

  if (provider === "flutterwave") {
    const secret = deploymentEnv("FLUTTERWAVE_SECRET_KEY");
    const res = await fetch("https://api.flutterwave.com/v3/payments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        tx_ref: txRef,
        amount,
        currency,
        redirect_url: input.redirectUrl,
        customer: {
          email: input.email,
          name: input.customerName || "OpenPayGB payer",
        },
        customizations: {
          title: "OpenPayGB",
          description: `Payment ${input.paymentId.slice(-8)}`,
        },
        meta: { paymentId: input.paymentId },
      }),
      cache: "no-store",
    });
    const json = (await res.json().catch(() => ({}))) as {
      status?: string;
      message?: string;
      data?: { link?: string };
    };
    if (!res.ok || json.status !== "success" || !json.data?.link) {
      throw new Error(json.message || `Flutterwave session failed (${res.status})`);
    }
    return { provider, authorizationUrl: json.data.link, providerReference: txRef };
  }

  const secret = deploymentEnv("PAYSTACK_SECRET_KEY");
  const res = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: input.email,
      amount: amount * 100,
      currency,
      reference: txRef,
      callback_url: input.redirectUrl,
      metadata: { paymentId: input.paymentId },
    }),
    cache: "no-store",
  });
  const json = (await res.json().catch(() => ({}))) as {
    status?: boolean;
    message?: string;
    data?: { authorization_url?: string; reference?: string };
  };
  if (!res.ok || !json.status || !json.data?.authorization_url) {
    throw new Error(json.message || `Paystack session failed (${res.status})`);
  }
  return {
    provider,
    authorizationUrl: json.data.authorization_url,
    providerReference: json.data.reference || txRef,
  };
}
