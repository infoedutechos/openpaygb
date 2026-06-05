import { describe, expect, it } from "vitest";
import {
  isLivePayConfigured,
  livePayCustomerReference,
  livePayNotConfiguredMessage,
  livePayUserMessage,
} from "@/lib/livepay/client";
import { ugandaPhoneToE164 } from "@/lib/livepay/uganda-phone";

describe("livepay client", () => {
  it("livePayCustomerReference trims to 30 alphanumeric chars", () => {
    const id = "507f1f77bcf86cd799439011";
    expect(livePayCustomerReference(id)).toBe(id);
    expect(livePayCustomerReference(`${id}extra-chars-here`)).toHaveLength(30);
  });

  it("isLivePayConfigured requires api key and account number", () => {
    const prevKey = process.env.LIVEPAY_API_KEY;
    const prevAcct = process.env.LIVEPAY_ACCOUNT_NUMBER;
    delete process.env.LIVEPAY_API_KEY;
    delete process.env.LIVEPAY_ACCOUNT_NUMBER;
    expect(isLivePayConfigured()).toBe(false);
    process.env.LIVEPAY_API_KEY = "k";
    expect(isLivePayConfigured()).toBe(false);
    process.env.LIVEPAY_ACCOUNT_NUMBER = "LP123";
    expect(isLivePayConfigured()).toBe(true);
    process.env.LIVEPAY_API_KEY = prevKey;
    process.env.LIVEPAY_ACCOUNT_NUMBER = prevAcct;
  });

  it("not configured message is stable", () => {
    expect(livePayNotConfiguredMessage()).toContain("LIVEPAY");
  });

  it("livePayUserMessage explains IP allowlist errors", () => {
    const msg = livePayUserMessage(new Error("IP 41.75.191.198 not allowed"));
    expect(msg).toContain("41.75.191.198");
    expect(msg).toContain("allowlist");
  });
});

describe("ugandaPhoneToE164", () => {
  it("converts local 0-prefix numbers", () => {
    expect(ugandaPhoneToE164("0777123456")).toBe("+256777123456");
  });

  it("accepts +256 format", () => {
    expect(ugandaPhoneToE164("+256777123456")).toBe("+256777123456");
  });
});
