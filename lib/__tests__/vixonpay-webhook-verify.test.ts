import { describe, expect, it } from "vitest";
import { createHmac } from "node:crypto";
import { vixonPayWebhookSignatureOk } from "@/lib/vixonpay/verify-webhook-signature";

describe("vixonPayWebhookSignatureOk", () => {
  const secret = "test-webhook-secret";
  const rawBody = JSON.stringify({
    event: "transaction.completed",
    data: {
      merchant_reference: "507f1f77bcf86cd799439011",
      internal_reference: "VXN99817266291345",
      transaction_status: "Completed",
    },
  });

  it("accepts valid X-VixonPay-Signature", () => {
    const sig = createHmac("sha512", secret).update(rawBody, "utf8").digest("hex");
    expect(vixonPayWebhookSignatureOk(rawBody, sig, secret)).toBe(true);
  });

  it("rejects tampered signature", () => {
    expect(vixonPayWebhookSignatureOk(rawBody, "deadbeef", secret)).toBe(false);
  });
});
