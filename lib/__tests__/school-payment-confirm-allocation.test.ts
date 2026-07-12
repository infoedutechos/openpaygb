import { beforeEach, describe, expect, it, vi } from "vitest";
import { PaymentRail } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  getOrganizationTermFeeRecovery,
  maybeAllocateSchoolPaymentOnConfirm,
} from "@/lib/school-payment-allocation";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    paymentAllocation: { count: vi.fn(), create: vi.fn(), aggregate: vi.fn() },
    organization: { findUnique: vi.fn(), update: vi.fn() },
    studentBillCharge: { findMany: vi.fn() },
    payment: { update: vi.fn() },
  },
}));

vi.mock("@/lib/school-org-context", () => ({
  loadSchoolOrgContext: vi.fn().mockResolvedValue({ sessionId: "sess1" }),
}));

vi.mock("@/lib/school-receipt-no", () => ({
  nextSchoolReceiptNo: vi.fn().mockResolvedValue("RP-99"),
}));

describe("school-payment-allocation confirm hook", () => {
  beforeEach(() => {
    vi.mocked(prisma.paymentAllocation.count).mockReset();
    vi.mocked(prisma.organization.findUnique).mockReset();
    vi.mocked(prisma.studentBillCharge.findMany).mockReset();
    vi.mocked(prisma.paymentAllocation.create).mockReset();
    vi.mocked(prisma.payment.update).mockReset();
    vi.mocked(prisma.paymentAllocation.aggregate).mockReset();
  });

  it("skips manual cash payments", async () => {
    await maybeAllocateSchoolPaymentOnConfirm({
      id: "p1",
      organizationId: "org1",
      studentId: "s1",
      semester: 1,
      totalUgx: 50_000,
      rail: PaymentRail.manual_cash,
    } as never);
    expect(prisma.organization.findUnique).not.toHaveBeenCalled();
  });

  it("allocates online payments for school tenants", async () => {
    vi.mocked(prisma.paymentAllocation.count).mockResolvedValue(0);
    vi.mocked(prisma.organization.findUnique).mockResolvedValue({ institutionTier: "school" } as never);
    vi.mocked(prisma.studentBillCharge.findMany).mockResolvedValue([
      { id: "c1", amountUgx: 100_000, allocations: [] },
    ] as never);

    await maybeAllocateSchoolPaymentOnConfirm({
      id: "p2",
      organizationId: "org1",
      studentId: "s1",
      semester: 1,
      totalUgx: 40_000,
      schoolReceiptNo: null,
      rail: PaymentRail.momo_bridge,
    } as never);

    expect(prisma.payment.update).toHaveBeenCalled();
    expect(prisma.paymentAllocation.create).toHaveBeenCalledTimes(1);
  });

  it("computes organization fee recovery from allocations", async () => {
    vi.mocked(prisma.studentBillCharge.findMany).mockResolvedValue([
      { id: "c1", amountUgx: 200_000 },
      { id: "c2", amountUgx: 100_000 },
    ] as never);
    vi.mocked(prisma.paymentAllocation.aggregate).mockResolvedValue({
      _sum: { amountUgx: 150_000 },
    } as never);

    const result = await getOrganizationTermFeeRecovery({
      organizationId: "org1",
      term: 1,
      sessionId: "sess1",
    });

    expect(result).toEqual({
      expectedUgx: 300_000,
      receivedUgx: 150_000,
      outstandingUgx: 150_000,
    });
  });
});
