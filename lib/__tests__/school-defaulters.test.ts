import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { listSchoolDefaulters } from "@/lib/school-defaulters";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    student: { findMany: vi.fn() },
  },
}));

vi.mock("@/lib/tuition-balance", () => ({
  getStudentBalanceSummary: vi.fn(),
}));

vi.mock("@/lib/school-payment-allocation", () => ({
  getAllocatedPaidUgx: vi.fn(),
}));

vi.mock("@/lib/school-account-balance", () => ({
  getStudentTermPaidUgx: vi.fn(),
}));

import { getStudentTermPaidUgx } from "@/lib/school-account-balance";

describe("school-defaulters", () => {
  beforeEach(() => {
    vi.mocked(prisma.student.findMany).mockReset();
    vi.mocked(getStudentTermPaidUgx).mockReset();
  });

  it("classifies overdue defaulters with bill charges", async () => {
    vi.mocked(prisma.student.findMany).mockResolvedValue([
      {
        id: "s1",
        name: "Jane Doe",
        admissionNo: "ADM-1",
        programmeCode: "P1-A",
        year: 1,
        schoolClass: { code: "P.1", name: "Primary One" },
        payments: [],
        billCharges: [{ amountUgx: 100_000 }],
      },
    ] as never);
    vi.mocked(getStudentTermPaidUgx).mockResolvedValue(0);

    const { rows } = await listSchoolDefaulters({
      organizationId: "org1",
      term: 1,
      sessionId: "sess1",
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]?.tab).toBe("overdue");
    expect(rows[0]?.debtBalanceUgx).toBe(100_000);
    expect(rows[0]?.classCode).toBe("P.1");
  });

  it("classifies non-defaulters when fully paid via allocations", async () => {
    vi.mocked(prisma.student.findMany).mockResolvedValue([
      {
        id: "s2",
        name: "John Smith",
        admissionNo: "ADM-2",
        programmeCode: "P2-A",
        year: 1,
        schoolClass: { code: "P.2", name: "Primary Two" },
        payments: [{ id: "p1", confirmedAt: new Date(), semester: 1, totalUgx: 80_000, schoolReceiptNo: "RP-1" }],
        billCharges: [{ amountUgx: 80_000 }],
      },
    ] as never);
    vi.mocked(getStudentTermPaidUgx).mockResolvedValue(80_000);

    const { rows } = await listSchoolDefaulters({
      organizationId: "org1",
      term: 1,
      tab: "non_defaulters",
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]?.debtBalanceUgx).toBe(0);
    expect(rows[0]?.tab).toBe("non_defaulters");
  });

  it("filters by tab", async () => {
    vi.mocked(prisma.student.findMany).mockResolvedValue([
      {
        id: "s1",
        name: "Debtor",
        admissionNo: "A1",
        programmeCode: "X",
        year: 1,
        schoolClass: null,
        payments: [],
        billCharges: [{ amountUgx: 50_000 }],
      },
      {
        id: "s2",
        name: "Clear",
        admissionNo: "A2",
        programmeCode: "Y",
        year: 1,
        schoolClass: null,
        payments: [],
        billCharges: [{ amountUgx: 10_000 }],
      },
    ] as never);
    vi.mocked(getStudentTermPaidUgx).mockImplementation(async ({ studentId }) =>
      studentId === "s2" ? 10_000 : 0,
    );

    const { rows } = await listSchoolDefaulters({
      organizationId: "org1",
      term: 1,
      tab: "overdue",
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]?.name).toBe("Debtor");
  });
});
