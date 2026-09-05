import { describe, expect, it } from "vitest";
import {
  SCHOOL_STUDENT_REGISTER_HEADERS,
  SCHOOL_STUDENT_REGISTER_SAMPLE_ROW,
  SCHOOL_STUDENT_REGISTER_TEMPLATE_HEADERS,
} from "@/lib/school-students-register";

describe("school students register columns", () => {
  it("covers identity, contacts, enrollment, and session", () => {
    expect([...SCHOOL_STUDENT_REGISTER_HEADERS]).toEqual([
      "Name",
      "AdmissionNo",
      "Sex",
      "Phone",
      "Email",
      "Address",
      "TelegramId",
      "Class",
      "Stream",
      "ProgrammeCode",
      "Year",
      "Term",
      "Session",
    ]);
    expect(SCHOOL_STUDENT_REGISTER_TEMPLATE_HEADERS).toContain("PortalPassword");
    expect(SCHOOL_STUDENT_REGISTER_SAMPLE_ROW).toHaveLength(
      SCHOOL_STUDENT_REGISTER_TEMPLATE_HEADERS.length,
    );
  });
});
