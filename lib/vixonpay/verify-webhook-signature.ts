import { createHmac, timingSafeEqual } from "node:crypto";
import { deploymentEnv } from "@/lib/deployment-env-resolve";
import { isProductionRuntime } from "@/lib/production-secrets";

/**
 * VixonPay webhook HMAC — https://docs.vixonpay.com/pay
 * X-VixonPay-Signature = HMAC SHA512 of the raw request body using the webhook secret.
 */
export function vixonPayWebhookSignatureOk(
  rawBody: string,
  signatureHeader: string,
  secret: string,
): boolean {
  const received = signatureHeader.trim();
  if (!received || !secret.trim() || !rawBody) return false;

  const expected = createHmac("sha512", secret.trim()).update(rawBody, "utf8").digest("hex");

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

/** When secret is set: require valid `X-VixonPay-Signature`. */
export function vixonPayWebhookAuthorized(
  req: Request,
  rawBody: string,
): { ok: true } | { ok: false } {
  const secret = deploymentEnv("VIXONPAY_WEBHOOK_SECRET");
  if (!secret) {
    return isProductionRuntime() ? { ok: false } : { ok: true };
  }

  const sig =
    req.headers.get("X-VixonPay-Signature")?.trim() ??
    req.headers.get("x-vixonpay-signature")?.trim() ??
    "";
  if (!sig) return { ok: false };

  if (!vixonPayWebhookSignatureOk(rawBody, sig, secret)) return { ok: false };
  return { ok: true };
}
