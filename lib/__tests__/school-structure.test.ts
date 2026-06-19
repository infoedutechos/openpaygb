import { describe, expect, it } from "vitest";
import {
  buildProgrammeCodeFromClassStream,
  buildProgrammeNameFromClassStream,
  normalizeSchoolCode,
} from "@/lib/school-structure";

describe("school-structure", () => {
  it("builds programme code from class and stream", () => {
    expect(buildProgrammeCodeFromClassStream("P7", "Stream")).toBe("P7-STREAM");
    expect(buildProgrammeCodeFromClassStream("s1", "science")).toBe("S1-SCIENCE");
  });

  it("builds programme display name", () => {
    expect(buildProgrammeNameFromClassStream("Primary Seven", "Main stream")).toBe(
      "Primary Seven · Main stream",
    );
  });

  it("normalizes school codes", () => {
    expect(normalizeSchoolCode(" p7 ")).toBe("P7");
    expect(normalizeSchoolCode("senior 1")).toBe("SENIOR-1");
  });
});
