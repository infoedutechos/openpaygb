import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * If `MBIYO_WEBHOOK_SECRET` is set, require `Signature` (or `X-Signature`) to match
 * HMAC-SHA256 of the **raw** request body (UTF-8), hex-encoded (per MBIYOPAY docs).
 */
import { deploymentEnv } from "@/lib/deployment-env-resolve";
import { isProductionRuntime } from "@/lib/production-secrets";

export function mbiyoWebhookSignatureOk(rawBody: string, req: Request): boolean {
  const secret = deploymentEnv("MBIYO_WEBHOOK_SECRET");
  if (!secret) return !isProductionRuntime();

  const headerRaw =
    req.headers.get("Signature") ??
    req.headers.get("signature") ??
    req.headers.get("X-Signature") ??
    req.headers.get("x-signature") ??
    "";
  const header = headerRaw.replace(/^sha256=/i, "").trim();
  if (!header) return false;

  const expectedHex = createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
  let expectedBuf: Buffer;
  let gotBuf: Buffer;
  try {
    expectedBuf = Buffer.from(expectedHex, "hex");
    gotBuf = Buffer.from(header, "hex");
  } catch {
    return false;
  }
  if (expectedBuf.length !== gotBuf.length || expectedBuf.length === 0) return false;
  return timingSafeEqual(expectedBuf, gotBuf);
}
