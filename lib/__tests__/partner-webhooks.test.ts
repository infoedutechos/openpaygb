import { describe, expect, it } from "vitest";
import { signPartnerWebhookPayload } from "@/lib/partner-webhooks";

describe("partner-webhooks", () => {
  it("signs payload deterministically", () => {
    const body = '{"type":"payment.confirmed"}';
    const a = signPartnerWebhookPayload("test-secret", body);
    const b = signPartnerWebhookPayload("test-secret", body);
    expect(a).toBe(b);
    expect(a).toMatch(/^[a-f0-9]{64}$/);
  });

  it("differs when secret changes", () => {
    const body = "{}";
    expect(signPartnerWebhookPayload("a", body)).not.toBe(signPartnerWebhookPayload("b", body));
  });
});
