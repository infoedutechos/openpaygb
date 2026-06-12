import { describe, expect, it } from "vitest";
import { DEX_HUB_HREF, pathnameIsDexHub } from "@/lib/dex-nav";

describe("dex-nav", () => {
  it("detects dex hub paths", () => {
    expect(pathnameIsDexHub(DEX_HUB_HREF)).toBe(true);
    expect(pathnameIsDexHub("/dex/buy")).toBe(true);
    expect(pathnameIsDexHub("/student")).toBe(false);
  });
});
