import { describe, expect, it } from "vitest";
import { programmeCodeSchema } from "@/lib/programme-code-zod";

describe("programmeCodeSchema", () => {
  it("allows slash in combination codes", () => {
    expect(programmeCodeSchema.safeParse("BEP-ENG/RE").success).toBe(true);
    expect(programmeCodeSchema.safeParse("DEP-MTC/AGRIC").success).toBe(true);
  });

  it("rejects spaces and other punctuation", () => {
    expect(programmeCodeSchema.safeParse("BEP ENG").success).toBe(false);
    expect(programmeCodeSchema.safeParse("BEP.ENG").success).toBe(false);
  });
});
