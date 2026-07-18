import { describe, expect, it } from "vitest";
import {
  academicYearToken,
  admissionNoPrefixFromSlug,
  admissionStem,
  formatAdmissionNo,
  formatAdmissionNoParts,
  orgToAdmissionFormatConfig,
  parseAdmissionSequence,
  previewAdmissionFormat,
  sanitizeAdmissionPrefix,
  studentCardPath,
} from "@/lib/admission-format";

describe("admission-format helpers", () => {
  it("builds a 3-letter prefix from slug", () => {
    expect(admissionNoPrefixFromSlug("riverside-demo")).toBe("RIV");
    expect(admissionNoPrefixFromSlug("default")).toBe("DEF");
  });

  it("formats padded sequence numbers", () => {
    expect(formatAdmissionNo("RIV", 2026, 42)).toBe("RIV-2026-0042");
    expect(formatAdmissionNoParts("STU", null, 7, 3, "-")).toBe("STU-007");
  });

  it("parses sequences from matching stems", () => {
    const stem = admissionStem("RIV", "2026", "-");
    expect(parseAdmissionSequence("RIV-2026-0042", stem, "RIV", "-")).toBe(42);
    expect(parseAdmissionSequence("RIV-2025-0001", stem, "RIV", "-")).toBeNull();
  });

  it("previews configured format", () => {
    const cfg = orgToAdmissionFormatConfig({
      slug: "riverside-demo",
      admissionFormatConfigured: true,
      admissionPrefix: "RIV",
      admissionIncludeYear: true,
      admissionYearSource: "calendar",
      admissionSeqDigits: 4,
      admissionSeparator: "-",
      admissionSeqStart: 1,
      currentAcademicYearLabel: "2025/2026",
    });
    expect(previewAdmissionFormat(cfg, 42).example).toMatch(/^RIV-\d{4}-0042$/);
  });

  it("extracts academic year token", () => {
    expect(academicYearToken("2025/2026", 2026)).toBe("2025");
    expect(sanitizeAdmissionPrefix("", "abc")).toBe("ABC");
  });

  it("builds the public card path", () => {
    expect(studentCardPath("abc123")).toBe("/student/card/abc123");
  });
});
