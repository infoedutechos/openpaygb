import { describe, expect, it, vi, beforeEach } from "vitest";
import { PaymentRail, PaymentStatus } from "@prisma/client";

const tx = {
  payment: {
    updateMany: vi.fn(),
    findUnique: vi.fn(),
  },
  paymentAllocation: {
    deleteMany: vi.fn(),
  },
  openPayCard: {
    findFirst: vi.fn(),
    update: vi.fn(),
  },
};

vi.mock("@/lib/prisma", () => ({
  prisma: {
    payment: {
      findUnique: vi.fn(),
    },
    $transaction: vi.fn(async (fn: (client: typeof tx) => Promise<unknown>) => fn(tx)),
  },
}));

vi.mock("@/lib/opgb-ledger", () => ({
  writeOpgbLedgerEntry: vi.fn().mockResolvedValue({ ok: true }),
}));

import { prisma } from "@/lib/prisma";
import { writeOpgbLedgerEntry } from "@/lib/opgb-ledger";
import { refundConfirmedPayment } from "@/lib/refund-payment";

describe("refundConfirmedPayment", () => {
  beforeEach(() => {
    vi.mocked(prisma.payment.findUnique).mockReset();
    vi.mocked(prisma.$transaction).mockClear();
    tx.payment.updateMany.mockReset().mockResolvedValue({ count: 1 });
    tx.payment.findUnique.mockReset();
    tx.paymentAllocation.deleteMany.mockReset().mockResolvedValue({ count: 0 });
    tx.openPayCard.findFirst.mockReset();
    tx.openPayCard.update.mockReset();
    vi.mocked(writeOpgbLedgerEntry).mockClear();
  });

  it("refunds a confirmed payment and clears allocations", async () => {
    vi.mocked(prisma.payment.findUnique).mockResolvedValue({
      id: "p1",
      status: PaymentStatus.confirmed,
      organizationId: "org1",
      studentId: "stu1",
      totalUgx: 50_000,
      rail: PaymentRail.livepay,
    } as never);

    const r = await refundConfirmedPayment({ paymentId: "p1", note: "duplicate" });
    expect(r.ok).toBe(true);
    expect(tx.payment.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "p1", status: PaymentStatus.confirmed },
        data: expect.objectContaining({ status: PaymentStatus.refunded }),
      }),
    );
    expect(tx.paymentAllocation.deleteMany).toHaveBeenCalledWith({ where: { paymentId: "p1" } });
    expect(writeOpgbLedgerEntry).not.toHaveBeenCalled();
  });

  it("restores OpenPayGB card balance and OPGB credit on card-rail refund", async () => {
    vi.mocked(prisma.payment.findUnique).mockResolvedValue({
      id: "p2",
      status: PaymentStatus.confirmed,
      organizationId: "org1",
      studentId: "stu1",
      totalUgx: 25_000,
      rail: PaymentRail.openpay_card,
    } as never);
    tx.openPayCard.findFirst.mockResolvedValue({ id: "card1" });

    const r = await refundConfirmedPayment({ paymentId: "p2" });
    expect(r.ok).toBe(true);
    expect(tx.openPayCard.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "card1" },
        data: { balanceUgx: { increment: 25_000 } },
      }),
    );
    expect(writeOpgbLedgerEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        direction: "credit",
        referenceKey: "refund:payment:p2",
        kind: "adjustment",
      }),
      tx,
    );
  });

  it("rejects pending payments", async () => {
    vi.mocked(prisma.payment.findUnique).mockResolvedValue({
      id: "p1",
      status: PaymentStatus.pending,
      organizationId: "org1",
      studentId: "stu1",
      totalUgx: 10_000,
      rail: PaymentRail.livepay,
    } as never);

    const r = await refundConfirmedPayment({ paymentId: "p1" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe(409);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
