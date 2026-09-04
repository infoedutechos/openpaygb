import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    developerApp: {
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

vi.mock("@/lib/default-organization", () => ({
  getDefaultOrganizationId: vi.fn(async () => "org-default"),
}));

import { prisma } from "@/lib/prisma";
import { DEVELOPER_CARD_PROGRAMME, ensureDeveloperOpenPayHolder } from "@/lib/developer-openpay-holder";

describe("ensureDeveloperOpenPayHolder", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("reuses linked DEVELOPER_CARD student", async () => {
    vi.mocked(prisma.developerApp.findUnique).mockResolvedValue({
      id: "app1",
      name: "Acme Integrator",
      contactEmail: "dev@acme.test",
      organizationId: "org1",
      openPayStudentId: "stu1",
    } as never);
    vi.mocked(prisma.student.findUnique).mockResolvedValue({
      id: "stu1",
      organizationId: "org1",
      name: "Acme",
      email: "dev@acme.test",
      programmeCode: DEVELOPER_CARD_PROGRAMME,
    } as never);

    const holder = await ensureDeveloperOpenPayHolder("app1");
    expect(holder.studentId).toBe("stu1");
    expect(prisma.student.create).not.toHaveBeenCalled();
  });

  it("creates a DEVELOPER_CARD holder when missing", async () => {
    vi.mocked(prisma.developerApp.findUnique).mockResolvedValue({
      id: "app2",
      name: "Beta",
      contactEmail: "beta@test.com",
      organizationId: null,
      openPayStudentId: null,
    } as never);
    vi.mocked(prisma.student.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.student.create).mockResolvedValue({
      id: "stu-new",
      organizationId: "org-default",
      name: "Beta",
      email: "beta@test.com",
    } as never);
    vi.mocked(prisma.developerApp.update).mockResolvedValue({} as never);

    const holder = await ensureDeveloperOpenPayHolder("app2");
    expect(holder.studentId).toBe("stu-new");
    expect(prisma.student.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ programmeCode: DEVELOPER_CARD_PROGRAMME }),
      }),
    );
  });
});
