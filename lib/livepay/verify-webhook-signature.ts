import { createHmac, timingSafeEqual } from "node:crypto";
import { deploymentEnv } from "@/lib/deployment-env-resolve";
import { isProductionRuntime } from "@/lib/production-secrets";
import { getLivePayWebhookUrl } from "@/lib/livepay/webhook-url";

export type LivePayWebhookPayload = {
  status: string;
  customer_reference: string;
  internal_reference: string;
};

/**
 * LivePay HMAC — https://docs.livepay.me/webhooks
 * stringToSign = webhookUrl + timestamp + status + customer_reference + internal_reference
 */
export function livePayWebhookSignatureOk(
  payload: LivePayWebhookPayload,
  signatureHeader: string,
  secret: string,
  webhookUrl: string,
): boolean {
  const header = signatureHeader.trim();
  if (!header || !secret.trim()) return false;

  let timestamp = "";
  let received = "";
  for (const part of header.split(",")) {
    const eq = part.indexOf("=");
    if (eq < 0) continue;
    const key = part.slice(0, eq).trim();
    const val = part.slice(eq + 1).trim();
    if (key === "t") timestamp = val;
    if (key === "v") received = val;
  }
  if (!timestamp || !received) return false;

  const stringToSign =
    webhookUrl + timestamp + payload.status + payload.customer_reference + payload.internal_reference;
  const expected = createHmac("sha256", secret.trim()).update(stringToSign, "utf8").digest("hex");

  let expectedBuf: Buffer;
  let gotBuf: Buffer;
  try {
    expectedBuf = Buffer.from(expected, "hex");
    gotBuf = Buffer.from(received, "hex");
  } catch {
    return false;
  }
  if (expectedBuf.length !== gotBuf.length || expectedBuf.length === 0) return false;
  return timingSafeEqual(expectedBuf, gotBuf);
}

/** When secret is set: require valid `X-Webhook-Signature` (prod) or legacy `x-livepay-webhook-secret`. */
export function livePayWebhookAuthorized(
  req: Request,
  payload: LivePayWebhookPayload,
): { ok: true } | { ok: false } {
  const secret = deploymentEnv("LIVEPAY_WEBHOOK_SECRET");
  if (!secret) {
    return isProductionRuntime() ? { ok: false } : { ok: true };
  }

  const legacy = req.headers.get("x-livepay-webhook-secret")?.trim();
  if (legacy && legacy === secret) return { ok: true };

  const sig =
    req.headers.get("X-Webhook-Signature")?.trim() ??
    req.headers.get("x-webhook-signature")?.trim() ??
    "";
  if (!sig) return { ok: false };

  const webhookUrl = getLivePayWebhookUrl();
  if (!webhookUrl) return { ok: false };

  if (!livePayWebhookSignatureOk(payload, sig, secret, webhookUrl)) return { ok: false };
  return { ok: true };
}
