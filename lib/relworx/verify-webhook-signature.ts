import { createHmac, timingSafeEqual } from "node:crypto";
import { isProductionRuntime } from "@/lib/production-secrets";
import { getRelworxWebhookUrl } from "@/lib/relworx/webhook-url";

export type RelworxWebhookPayload = {
  status: string;
  customer_reference: string;
  internal_reference: string;
};

/**
 * Relworx HMAC — https://payments.relworx.com/docs/webhooks/authenticate_webhook_requests/
 * signed = url + timestamp + sorted(status, customer_reference, internal_reference) key+value pairs
 */
export function relworxWebhookSignatureOk(
  payload: RelworxWebhookPayload,
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

  const params: Record<string, string> = {
    status: payload.status,
    customer_reference: payload.customer_reference,
    internal_reference: payload.internal_reference,
  };
  const keys = Object.keys(params).sort();
  let signed = webhookUrl + timestamp;
  for (const k of keys) {
    signed += k + params[k];
  }

  const expected = createHmac("sha256", secret.trim()).update(signed, "utf8").digest("hex");

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

export function relworxWebhookAuthorized(
  req: Request,
  payload: RelworxWebhookPayload,
): { ok: true } | { ok: false } {
  const secret = process.env.RELWORX_WEBHOOK_KEY?.trim() ?? process.env.RELWORX_WEBHOOK_SECRET?.trim();
  if (!secret) {
    return isProductionRuntime() ? { ok: false } : { ok: true };
  }

  const legacy = req.headers.get("x-relworx-webhook-secret")?.trim();
  if (legacy && legacy === secret) return { ok: true };

  const sig =
    req.headers.get("Relworx-Signature")?.trim() ??
    req.headers.get("relworx-signature")?.trim() ??
    "";
  if (!sig) return { ok: false };

  const webhookUrl = getRelworxWebhookUrl();
  if (!webhookUrl) return { ok: false };

  if (!relworxWebhookSignatureOk(payload, sig, secret, webhookUrl)) return { ok: false };
  return { ok: true };
}
