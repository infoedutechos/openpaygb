import { describe, expect, it } from "vitest";
import { normalizeMomoPhone } from "@/lib/merchant-payout";

describe("normalizeMomoPhone", () => {
  it("normalizes local 07… and +256 formats", () => {
    expect(normalizeMomoPhone("0755123456")).toBe("256755123456");
    expect(normalizeMomoPhone("+256755123456")).toBe("256755123456");
    expect(normalizeMomoPhone("256 755 123456")).toBe("256755123456");
  });
});
