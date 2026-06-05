import { describe, expect, it } from "vitest";
import { createHmac } from "node:crypto";
import { relworxWebhookSignatureOk } from "@/lib/relworx/verify-webhook-signature";

/** Mirrors Relworx PHP sample from authenticate_webhook_requests docs. */
function generateRelworxSignature(
  webhookKey: string,
  timestamp: string,
  url: string,
  params: Record<string, string>,
): string {
  const keys = Object.keys(params).sort();
  let signed = url + timestamp;
  for (const k of keys) {
    signed += k + params[k];
  }
  return createHmac("sha256", webhookKey).update(signed, "utf8").digest("hex");
}

describe("relworxWebhookSignatureOk", () => {
  it("validates Relworx-Signature header", () => {
    const url = "https://pay.example.com/api/webhooks/relworx";
    const key = "test-webhook-key";
    const timestamp = "1561370460";
    const payload = {
      status: "success",
      customer_reference: "shdfjsue789sh8jshuehu",
      internal_reference: "jshfufehkshffkseuhfskahakhuefak",
    };
    const v = generateRelworxSignature(key, timestamp, url, payload);
    const header = `t=${timestamp},v=${v}`;
    expect(relworxWebhookSignatureOk(payload, header, key, url)).toBe(true);
  });

  it("rejects wrong URL in signature", () => {
    const payload = {
      status: "success",
      customer_reference: "abc123456789",
      internal_reference: "internal123456789",
    };
    const v = generateRelworxSignature("key", "1", "https://a.com/hook", payload);
    expect(relworxWebhookSignatureOk(payload, `t=1,v=${v}`, "key", "https://b.com/hook")).toBe(false);
  });
});
