import { beforeEach, describe, expect, it, vi } from "vitest";
import { PaymentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getStudentTermOutstanding } from "@/lib/school-account-balance";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    studentBillCharge: { aggregate: vi.fn() },
    paymentAllocation: { aggregate: vi.fn() },
    payment: { aggregate: vi.fn() },
    schoolFundsAppropriation: { findMany: vi.fn() },
    schoolOutflowVoucher: { findMany: vi.fn() },
    schoolAccount: { findMany: vi.fn() },
    schoolSalaryPayment: { aggregate: vi.fn() },
  },
}));

vi.mock("@/lib/school-salary-account", () => ({
  findSalaryExpenditureAccount: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/lib/school-payment-allocation", () => ({
  getAllocatedPaidUgx: vi.fn(),
}));

import { getAllocatedPaidUgx } from "@/lib/school-payment-allocation";

describe("school-account-balance", () => {
  beforeEach(() => {
    vi.mocked(prisma.studentBillCharge.aggregate).mockReset();
    vi.mocked(prisma.payment.aggregate).mockReset();
    vi.mocked(getAllocatedPaidUgx).mockReset();
  });

  it("returns zero when no charges billed", async () => {
    vi.mocked(prisma.studentBillCharge.aggregate).mockResolvedValue({ _sum: { amountUgx: 0 } } as never);
    const out = await getStudentTermOutstanding({ organizationId: "org1", studentId: "s1", term: 1 });
    expect(out).toBe(0);
  });

  it("uses allocation-based paid amount when allocations exist", async () => {
    vi.mocked(prisma.studentBillCharge.aggregate).mockResolvedValue({ _sum: { amountUgx: 500_000 } } as never);
    vi.mocked(getAllocatedPaidUgx).mockResolvedValue(200_000);
    const out = await getStudentTermOutstanding({ organizationId: "org1", studentId: "s1", term: 1 });
    expect(out).toBe(300_000);
    expect(prisma.payment.aggregate).not.toHaveBeenCalled();
  });

  it("falls back to payment totals when no allocations", async () => {
    vi.mocked(prisma.studentBillCharge.aggregate).mockResolvedValue({ _sum: { amountUgx: 400_000 } } as never);
    vi.mocked(getAllocatedPaidUgx).mockResolvedValue(0);
    vi.mocked(prisma.payment.aggregate).mockResolvedValue({ _sum: { totalUgx: 150_000 } } as never);
    const out = await getStudentTermOutstanding({ organizationId: "org1", studentId: "s1", term: 1 });
    expect(out).toBe(250_000);
    expect(prisma.payment.aggregate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: PaymentStatus.confirmed, semester: 1 }),
      }),
    );
  });
});
