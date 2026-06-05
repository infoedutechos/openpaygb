import { describe, expect, it } from "vitest";
import { paymentPublicPollRateLimited } from "@/lib/payment-public-rate-limit";

function req(): Request {
  return new Request("http://localhost/api/payments/abc/public", {
    headers: { "x-forwarded-for": "203.0.113.10" },
  });
}

describe("paymentPublicPollRateLimited", () => {
  it("allows sustained polling for one payment id", () => {
    const id = "507f1f77bcf86cd799439011";
    let blocked = 0;
    for (let i = 0; i < 120; i++) {
      if (paymentPublicPollRateLimited(req(), id)) blocked += 1;
    }
    expect(blocked).toBe(0);
  });
});
