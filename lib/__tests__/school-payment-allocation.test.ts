import { beforeEach, describe, expect, it, vi } from "vitest";
import { PaymentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { allocatePaymentToBillCharges, getAllocatedPaidUgx } from "@/lib/school-payment-allocation";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    studentBillCharge: {
      findMany: vi.fn(),
    },
    paymentAllocation: {
      create: vi.fn(),
      aggregate: vi.fn(),
    },
  },
}));

describe("school-payment-allocation", () => {
  beforeEach(() => {
    vi.mocked(prisma.studentBillCharge.findMany).mockReset();
    vi.mocked(prisma.paymentAllocation.create).mockReset();
    vi.mocked(prisma.paymentAllocation.aggregate).mockReset();
  });

  it("allocates payment FIFO across bill charges", async () => {
    vi.mocked(prisma.studentBillCharge.findMany).mockResolvedValue([
      {
        id: "c1",
        amountUgx: 100_000,
        createdAt: new Date("2026-01-01"),
        schoolAccount: { name: "Tuition" },
        allocations: [{ amountUgx: 40_000 }],
      },
      {
        id: "c2",
        amountUgx: 50_000,
        createdAt: new Date("2026-01-02"),
        schoolAccount: { name: "Meals" },
        allocations: [],
      },
    ] as never);

    const result = await allocatePaymentToBillCharges({
      organizationId: "org1",
      paymentId: "pay1",
      studentId: "stu1",
      term: 1,
      amountUgx: 80_000,
    });

    expect(result.allocations).toEqual([
      { billChargeId: "c1", amountUgx: 60_000 },
      { billChargeId: "c2", amountUgx: 20_000 },
    ]);
    expect(prisma.paymentAllocation.create).toHaveBeenCalledTimes(2);
  });

  it("sums confirmed allocations for a student term", async () => {
    vi.mocked(prisma.studentBillCharge.findMany).mockResolvedValue([{ id: "c1" }, { id: "c2" }] as never);
    vi.mocked(prisma.paymentAllocation.aggregate).mockResolvedValue({
      _sum: { amountUgx: 250_000 },
    } as never);

    const paid = await getAllocatedPaidUgx({
      organizationId: "org1",
      studentId: "stu1",
      term: 2,
    });

    expect(paid).toBe(250_000);
    expect(prisma.paymentAllocation.aggregate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          billChargeId: { in: ["c1", "c2"] },
          payment: { status: PaymentStatus.confirmed },
        }),
      }),
    );
  });

  it("returns zero when no bill charges exist", async () => {
    vi.mocked(prisma.studentBillCharge.findMany).mockResolvedValue([]);
    const paid = await getAllocatedPaidUgx({ organizationId: "org1", studentId: "stu1", term: 1 });
    expect(paid).toBe(0);
    expect(prisma.paymentAllocation.aggregate).not.toHaveBeenCalled();
  });
});
