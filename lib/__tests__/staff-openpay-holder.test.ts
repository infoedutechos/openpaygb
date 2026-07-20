import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    schoolStaff: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    student: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import { ensureStaffOpenPayHolder, STAFF_CARD_PROGRAMME } from "@/lib/staff-openpay-holder";

describe("ensureStaffOpenPayHolder", () => {
  beforeEach(() => {
    vi.mocked(prisma.schoolStaff.findUnique).mockReset();
    vi.mocked(prisma.schoolStaff.update).mockReset();
    vi.mocked(prisma.student.findUnique).mockReset();
    vi.mocked(prisma.student.findFirst).mockReset();
    vi.mocked(prisma.student.create).mockReset();
  });

  it("reuses linked STAFF_CARD student", async () => {
    vi.mocked(prisma.schoolStaff.findUnique).mockResolvedValue({
      id: "staff1",
      name: "Jane",
      email: "jane@school.test",
      staffCode: "T-001",
      organizationId: "org1",
      openPayStudentId: "stu1",
    } as never);
    vi.mocked(prisma.student.findUnique).mockResolvedValue({
      id: "stu1",
      organizationId: "org1",
      name: "Jane",
      email: "jane@school.test",
      programmeCode: STAFF_CARD_PROGRAMME,
    } as never);

    const h = await ensureStaffOpenPayHolder("staff1");
    expect(h.studentId).toBe("stu1");
    expect(prisma.student.create).not.toHaveBeenCalled();
  });

  it("creates a STAFF_CARD holder when missing", async () => {
    vi.mocked(prisma.schoolStaff.findUnique).mockResolvedValue({
      id: "staff1abcdefgh",
      name: "Jane",
      email: "",
      staffCode: "T-001",
      organizationId: "org1",
      openPayStudentId: null,
    } as never);
    vi.mocked(prisma.student.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.student.create).mockResolvedValue({
      id: "newstu",
      organizationId: "org1",
      name: "Jane",
      email: "staff-abcdefgh@staff.odelhub.local",
    } as never);

    const h = await ensureStaffOpenPayHolder("staff1abcdefgh");
    expect(h.studentId).toBe("newstu");
    expect(prisma.student.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ programmeCode: STAFF_CARD_PROGRAMME }),
      }),
    );
    expect(prisma.schoolStaff.update).toHaveBeenCalled();
  });
});
