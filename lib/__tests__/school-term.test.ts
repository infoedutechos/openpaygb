import { describe, expect, it } from "vitest";
import {
  normalizeSchoolTerm,
  schoolTermLabel,
  schoolTermOrdinal,
  schoolTermOptions,
  SCHOOL_TERM_MAX,
  SCHOOL_TERM_MIN,
} from "@/lib/school-term";

describe("school-term", () => {
  it("clamps invalid values to term range", () => {
    expect(normalizeSchoolTerm(0)).toBe(SCHOOL_TERM_MIN);
    expect(normalizeSchoolTerm(-3)).toBe(SCHOOL_TERM_MIN);
    expect(normalizeSchoolTerm(4)).toBe(4);
    expect(normalizeSchoolTerm(99)).toBe(SCHOOL_TERM_MAX);
    expect(normalizeSchoolTerm(100)).toBe(SCHOOL_TERM_MAX);
    expect(normalizeSchoolTerm("2")).toBe(2);
    expect(normalizeSchoolTerm(null)).toBe(1);
  });

  it("labels terms consistently with reference app ordinals", () => {
    expect(schoolTermLabel(1)).toBe("Term 1");
    expect(schoolTermLabel(4)).toBe("Term 4");
    expect(schoolTermOrdinal(1)).toBe("FIRST");
    expect(schoolTermOrdinal(2)).toBe("SECOND");
    expect(schoolTermOrdinal(3)).toBe("THIRD");
    expect(schoolTermOrdinal(4)).toBe("TERM 4");
  });

  it("exposes three term options", () => {
    const opts = schoolTermOptions();
    expect(opts).toHaveLength(3);
    expect(opts.map((o) => o.value)).toEqual([1, 2, 3]);
  });
});
