import { describe, expect, it } from "vitest";
import { maskHolderName, maskedPanForStudent, openPayCardValidThru } from "@/lib/openpay-card";

describe("openpay card display helpers", () => {
  it("formats a closed-loop display PAN", () => {
    const pan = maskedPanForStudent("507f1f77bcf86cd799439011");
    expect(pan).toMatch(/^6271 [0-9A-F]{2}XX XXXX [0-9A-F]{4}$/);
  });

  it("masks holder names", () => {
    expect(maskHolderName("Isaiah Lukwago")).toContain("IS");
    expect(maskHolderName("Isaiah Lukwago")).toContain("*");
  });

  it("formats valid thru from issuedAt", () => {
    expect(openPayCardValidThru(new Date("2024-01-15T00:00:00Z"))).toBe("01/27");
    expect(openPayCardValidThru(null)).toBe("**/**");
  });
});
