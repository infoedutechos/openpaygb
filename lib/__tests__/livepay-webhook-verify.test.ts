import { describe, expect, it } from "vitest";
import { createHmac } from "node:crypto";
import { livePayWebhookSignatureOk } from "@/lib/livepay/verify-webhook-signature";

describe("livePayWebhookSignatureOk", () => {
  const webhookUrl = "https://pay.example.com/api/webhooks/livepay";
  const secret = "test-webhook-secret";
  const payload = {
    status: "Success",
    customer_reference: "507f1f77bcf86cd799439011",
    internal_reference: "550e8400-e29b-41d4-a716-446655440000",
  };

  it("accepts valid X-Webhook-Signature", () => {
    const timestamp = "1705314900";
    const stringToSign =
      webhookUrl +
      timestamp +
      payload.status +
      payload.customer_reference +
      payload.internal_reference;
    const sig = createHmac("sha256", secret).update(stringToSign, "utf8").digest("hex");
    const header = `t=${timestamp},v=${sig}`;
    expect(livePayWebhookSignatureOk(payload, header, secret, webhookUrl)).toBe(true);
  });

  it("rejects tampered signature", () => {
    const header = "t=1705314900,v=deadbeef";
    expect(livePayWebhookSignatureOk(payload, header, secret, webhookUrl)).toBe(false);
  });
});
