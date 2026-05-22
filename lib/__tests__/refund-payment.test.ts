import { describe, expect, it, vi, beforeEach } from "vitest";
import { PaymentStatus } from "@prisma/client";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    payment: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import { refundConfirmedPayment } from "@/lib/refund-payment";

describe("refundConfirmedPayment", () => {
  beforeEach(() => {
    vi.mocked(prisma.payment.findUnique).mockReset();
    vi.mocked(prisma.payment.update).mockReset();
  });

  it("refunds a confirmed payment", async () => {
    vi.mocked(prisma.payment.findUnique).mockResolvedValue({
      id: "p1",
      status: PaymentStatus.confirmed,
      organizationId: "org1",
    } as never);

    const r = await refundConfirmedPayment({ paymentId: "p1", note: "duplicate" });
    expect(r.ok).toBe(true);
    expect(prisma.payment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: PaymentStatus.refunded }),
      }),
    );
  });

  it("rejects pending payments", async () => {
    vi.mocked(prisma.payment.findUnique).mockResolvedValue({
      id: "p1",
      status: PaymentStatus.pending,
      organizationId: "org1",
    } as never);

    const r = await refundConfirmedPayment({ paymentId: "p1" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe(409);
  });
});
