import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    organization: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { isValidSchoolPayCode } from "@/lib/school-pay-code";

describe("isValidSchoolPayCode", () => {
  it("accepts 6-digit codes", () => {
    expect(isValidSchoolPayCode("123456")).toBe(true);
    expect(isValidSchoolPayCode(" 654321 ")).toBe(true);
  });

  it("rejects short, long, and non-numeric codes", () => {
    expect(isValidSchoolPayCode("")).toBe(false);
    expect(isValidSchoolPayCode("12345")).toBe(false);
    expect(isValidSchoolPayCode("1234567")).toBe(false);
    expect(isValidSchoolPayCode("12a456")).toBe(false);
  });
});
