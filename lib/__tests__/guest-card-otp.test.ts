import { describe, expect, it } from "vitest";
import { hashGuestCardOtp, GUEST_CARD_OTP_MAX_ATTEMPTS } from "@/lib/guest-card-otp";

describe("guest-card-otp", () => {
  it("hashes OTP deterministically", () => {
    expect(hashGuestCardOtp("123456")).toBe(hashGuestCardOtp("123456"));
    expect(hashGuestCardOtp("123456")).not.toBe(hashGuestCardOtp("654321"));
  });

  it("caps verification attempts", () => {
    expect(GUEST_CARD_OTP_MAX_ATTEMPTS).toBe(5);
  });
});
