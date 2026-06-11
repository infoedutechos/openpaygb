import { describe, expect, it } from "vitest";
import { toEpochMs, toIsoString } from "@/lib/iso-date";

describe("iso-date", () => {
  it("serializes Date instances", () => {
    const d = new Date("2026-01-15T10:00:00.000Z");
    expect(toIsoString(d)).toBe("2026-01-15T10:00:00.000Z");
  });

  it("serializes ISO strings from cache", () => {
    expect(toIsoString("2026-01-15T10:00:00.000Z")).toBe("2026-01-15T10:00:00.000Z");
  });

  it("returns null for invalid values", () => {
    expect(toIsoString(null)).toBeNull();
    expect(toIsoString("not-a-date")).toBeNull();
  });

  it("toEpochMs works for strings", () => {
    expect(toEpochMs("2026-01-15T10:00:00.000Z")).toBe(new Date("2026-01-15T10:00:00.000Z").getTime());
  });
});
