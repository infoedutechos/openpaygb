import { describe, expect, it } from "vitest";
import { AUDIENCE_GUIDE_LIST } from "@/lib/audience-guides";

describe("mobile nav wiring contracts", () => {
  it("keeps audience guide help hrefs stable for drawer secondary sections", () => {
    expect(AUDIENCE_GUIDE_LIST.every((g) => g.helpHref.startsWith("/help/"))).toBe(true);
  });
});
