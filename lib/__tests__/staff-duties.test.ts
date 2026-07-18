import { describe, expect, it } from "vitest";
import {
  DEFAULT_STAFF_DUTIES,
  isTeachingDutyLabel,
  parseStaffDuties,
} from "@/lib/staff-duties";

describe("staff-duties", () => {
  it("falls back to defaults when empty", () => {
    expect(parseStaffDuties([])).toEqual(DEFAULT_STAFF_DUTIES);
    expect(parseStaffDuties(null)).toEqual(DEFAULT_STAFF_DUTIES);
  });

  it("parses configured duties and dedupes", () => {
    const duties = parseStaffDuties(
      [
        { label: "DOS", category: "teaching" },
        { label: "dos", category: "non_teaching" },
        { label: "Librarian", category: "non_teaching" },
      ],
      { fallbackDefaults: false },
    );
    expect(duties).toEqual([
      { label: "DOS", category: "teaching" },
      { label: "Librarian", category: "non_teaching" },
    ]);
  });

  it("classifies teaching from catalogue category", () => {
    const catalogue = [{ label: "Bursar", category: "non_teaching" as const }];
    expect(isTeachingDutyLabel("Bursar", catalogue)).toBe(false);
    expect(isTeachingDutyLabel("DOS", catalogue)).toBe(true);
  });
});
