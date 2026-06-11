import { describe, expect, it } from "vitest";
import {
  OPGB_MINOR_UNITS_PER_UGX,
  opgbMinorToUgx,
  ugxToOpgbMinor,
} from "@/lib/opgb-peg";

describe("opgb-peg", () => {
  it("Phase 1 peg is 1:1 UGX", () => {
    expect(OPGB_MINOR_UNITS_PER_UGX).toBe(1);
    expect(ugxToOpgbMinor(50_000)).toBe(50_000);
    expect(opgbMinorToUgx(50_000)).toBe(50_000);
  });
});
