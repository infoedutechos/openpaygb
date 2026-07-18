import { describe, expect, it } from "vitest";
import {
  admissionNoPrefixFromSlug,
  formatAdmissionNo,
  studentCardPath,
} from "@/lib/admission-no";

describe("admission-no helpers", () => {
  it("builds a 3-letter prefix from slug", () => {
    expect(admissionNoPrefixFromSlug("riverside-demo")).toBe("RIV");
    expect(admissionNoPrefixFromSlug("default")).toBe("DEF");
  });

  it("formats padded sequence numbers", () => {
    expect(formatAdmissionNo("RIV", 2026, 42)).toBe("RIV-2026-0042");
  });

  it("builds the public card path", () => {
    expect(studentCardPath("abc123")).toBe("/student/card/abc123");
  });
});
