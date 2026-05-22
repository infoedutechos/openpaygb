import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    payment: {
      updateMany: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import { expireStalePendingPayments, pendingPaymentExpiryMs } from "@/lib/expire-pending-payments";

describe("pendingPaymentExpiryMs", () => {
  it("defaults to 48 hours", () => {
    const prev = process.env.PENDING_PAYMENT_TTL_HOURS;
    delete process.env.PENDING_PAYMENT_TTL_HOURS;
    expect(pendingPaymentExpiryMs()).toBe(48 * 60 * 60 * 1000);
    if (prev !== undefined) process.env.PENDING_PAYMENT_TTL_HOURS = prev;
  });
});

describe("expireStalePendingPayments", () => {
  beforeEach(() => {
    vi.mocked(prisma.payment.updateMany).mockResolvedValue({ count: 2 });
  });

  it("marks stale pending payments failed", async () => {
    const r = await expireStalePendingPayments();
    expect(r.expired).toBe(2);
    expect(prisma.payment.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: "pending" }),
        data: expect.objectContaining({
          status: "failed",
          confirmedAt: null,
          cancelReason: "expired",
        }),
      }),
    );
  });
});
