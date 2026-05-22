import { describe, expect, it } from "vitest";
import { feeTotal, tonToNanotonString, ugxToTon } from "@/lib/money";

describe("money helpers", () => {
  it("ugxToTon converts at rate", () => {
    expect(ugxToTon(257_000, 257_000)).toBe(1);
    expect(ugxToTon(602_000, 257_000)).toBe(2.3424);
  });

  it("feeTotal sums", () => {
    expect(feeTotal(450_000, 152_000)).toBe(602_000);
  });

  it("tonToNanotonString is integer string", () => {
    expect(tonToNanotonString(2.3424)).toBe("2342400000");
  });
});
