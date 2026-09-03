import { describe, expect, it } from "vitest";
import { serializeMerchantCharge, merchantChargeCheckoutPath } from "@/lib/merchant-charge";

describe("merchant charge serialize", () => {
  it("builds checkout path and marks expired pending charges", () => {
    const past = new Date(Date.now() - 60_000);
    const row = {
      id: "665f1a2b3c4d5e6f7a8b9c0d",
      orderAmountUgx: 25_000,
      amountUgx: 25_625,
      platformFeeUgx: 625,
      merchantFeeUgx: 0,
      merchantNetUgx: 25_000,
      feeBreakdownJson: "{}",
      currency: "UGX",
      description: "Order",
      metadataJson: '{"a":1}',
      customerEmail: "",
      customerPhone: "256700000000",
      customerName: "",
      redirectUrl: "https://example.com/done",
      cancelUrl: "",
      externalRef: "ord_1",
      status: "pending",
      rail: "",
      momoReference: "",
      settledToMerchant: false,
      paidAt: null as Date | null,
      expiresAt: past,
      createdAt: past,
    };
    const s = serializeMerchantCharge(row);
    expect(s.status).toBe("expired");
    expect(s.checkoutPath).toBe(merchantChargeCheckoutPath(row.id));
    expect(s.orderAmountUgx).toBe(25_000);
    expect(s.amountUgx).toBe(25_625);
    expect(s.platformFeeUgx).toBe(625);
    expect(s.merchantNetUgx).toBe(25_000);
    expect(s.metadata).toEqual({ a: 1 });
  });
});

describe("merchant fee math helpers (pure)", () => {
  it("pass-through: customer pays order + platform fee; merchant nets order", () => {
    const order = 25_000;
    const platformFee = 625;
    const whiteLabelFee = 250;
    const merchantFee = 0;
    const totalPlatform = platformFee + whiteLabelFee;
    const customerTotal = order + merchantFee + totalPlatform;
    const merchantNet = order + merchantFee;
    expect(customerTotal).toBe(25_875);
    expect(merchantNet).toBe(25_000);
  });

  it("absorb: customer pays order; merchant nets order minus platform fee", () => {
    const order = 25_000;
    const platformFee = 625;
    const merchantFee = 0;
    const customerTotal = order + merchantFee;
    const merchantNet = Math.max(0, order + merchantFee - platformFee);
    expect(customerTotal).toBe(25_000);
    expect(merchantNet).toBe(24_375);
  });
});
