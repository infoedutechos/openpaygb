import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { listSchoolDefaulters } from "@/lib/school-defaulters";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    student: { findMany: vi.fn() },
  },
}));

vi.mock("@/lib/school-fee-ledger", () => ({
  listStudentFeeLedgers: vi.fn(),
}));

import { listStudentFeeLedgers } from "@/lib/school-fee-ledger";

describe("school-defaulters", () => {
  beforeEach(() => {
    vi.mocked(prisma.student.findMany).mockReset();
    vi.mocked(listStudentFeeLedgers).mockReset();
  });

  it("classifies overdue defaulters with bill charges", async () => {
    vi.mocked(listStudentFeeLedgers).mockResolvedValue({
      rows: [
        {
          studentId: "s1",
          studentName: "Jane Doe",
          admissionNo: "ADM-1",
          classCode: "P.1",
          className: "Primary One",
          totalOutstandingUgx: 100_000,
          previousBalancePaidUgx: 0,
          currentTermPaidUgx: 0,
          latestReceiptNo: null,
        },
      ],
    } as never);
    vi.mocked(prisma.student.findMany).mockResolvedValue([
      { id: "s1", payments: [] },
    ] as never);

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
    vi.mocked(listStudentFeeLedgers).mockResolvedValue({
      rows: [
        {
          studentId: "s2",
          studentName: "John Smith",
          admissionNo: "ADM-2",
          classCode: "P.2",
          className: "Primary Two",
          totalOutstandingUgx: 0,
          previousBalancePaidUgx: 0,
          currentTermPaidUgx: 80_000,
          latestReceiptNo: "RP-1",
        },
      ],
    } as never);
    vi.mocked(prisma.student.findMany).mockResolvedValue([
      {
        id: "s2",
        payments: [
          {
            id: "p1",
            confirmedAt: new Date(),
            schoolReceiptNo: "RP-1",
          },
        ],
      },
    ] as never);

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
    vi.mocked(listStudentFeeLedgers).mockResolvedValue({
      rows: [
        {
          studentId: "s1",
          studentName: "A",
          admissionNo: "1",
          classCode: "P.1",
          className: "Primary One",
          totalOutstandingUgx: 50_000,
          previousBalancePaidUgx: 0,
          currentTermPaidUgx: 0,
          latestReceiptNo: null,
        },
        {
          studentId: "s2",
          studentName: "B",
          admissionNo: "2",
          classCode: "P.1",
          className: "Primary One",
          totalOutstandingUgx: 0,
          previousBalancePaidUgx: 0,
          currentTermPaidUgx: 10_000,
          latestReceiptNo: null,
        },
      ],
    } as never);
    vi.mocked(prisma.student.findMany).mockResolvedValue([
      { id: "s1", payments: [] },
      { id: "s2", payments: [] },
    ] as never);

    const { rows } = await listSchoolDefaulters({
      organizationId: "org1",
      term: 1,
      tab: "overdue",
    });

    expect(rows.every((r) => r.tab === "overdue")).toBe(true);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.studentId).toBe("s1");
  });
});
