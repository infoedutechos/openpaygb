import { describe, it, expect, vi, beforeEach } from "vitest";
import { PaymentRail, PaymentStatus } from "@prisma/client";

vi.mock("@/lib/rate-limit", () => ({
  clientIp: () => "10.0.0.4",
  rateLimitHit: () => false,
}));

vi.mock("@/lib/ton-pay-options", () => ({
  getServerTonPayOptions: vi.fn(() => ({ apiKey: "test" })),
}));

vi.mock("@ton-pay/api", () => ({
  TON: { _brand: "TON" },
  createTonPayTransfer: vi.fn(),
}));

vi.mock("@/lib/checkout-session", () => ({
  assertCheckoutStudentAccess: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    payment: {
      findUnique: vi.fn(),
    },
  },
}));

import { POST } from "@/app/api/public/checkout/ton-pay-transfer/route";
import { assertCheckoutStudentAccess } from "@/lib/checkout-session";
import { prisma } from "@/lib/prisma";
import { createTonPayTransfer } from "@ton-pay/api";

const PAY_ID = "507f1f77bcf86cd799439011";

const basePayment = {
  studentId: "stu-1",
  organizationId: "org-1",
};

async function post(body: unknown) {
  return POST(
    new Request("http://localhost/api/public/checkout/ton-pay-transfer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
  );
}

describe("POST /api/public/checkout/ton-pay-transfer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(assertCheckoutStudentAccess).mockResolvedValue({ ok: true });
    vi.mocked(createTonPayTransfer).mockResolvedValue({
      message: { address: "x", amount: "1", payload: "p" },
      reference: "ref-1",
      bodyBase64Hash: "hash",
    } as unknown as Awaited<ReturnType<typeof createTonPayTransfer>>);
  });

  it("returns 400 for invalid body", async () => {
    const r = await post({});
    expect(r.status).toBe(400);
  });

  it("returns 404 when payment does not exist", async () => {
    vi.mocked(prisma.payment.findUnique).mockResolvedValue(null);
    const r = await post({
      paymentId: PAY_ID,
      senderAddr: "UQAbcdefghijklmnopqrstuvwxyz",
    });
    expect(r.status).toBe(404);
  });

  it("returns 400 when payment is not pending", async () => {
    vi.mocked(prisma.payment.findUnique).mockResolvedValue({
      ...basePayment,
      status: PaymentStatus.confirmed,
      rail: PaymentRail.web,
      tonAmount: 1,
      destinationWallet: "UQDest_________________________________",
      memo: "m",
    } as never);
    const r = await post({
      paymentId: PAY_ID,
      senderAddr: "UQAbcdefghijklmnopqrstuvwxyz",
    });
    expect(r.status).toBe(400);
  });

  it("returns 400 for momo_bridge rail", async () => {
    vi.mocked(prisma.payment.findUnique).mockResolvedValue({
      ...basePayment,
      status: PaymentStatus.pending,
      rail: PaymentRail.momo_bridge,
      tonAmount: 1,
      destinationWallet: "UQDest_________________________________",
      memo: "m",
    } as never);
    const r = await post({
      paymentId: PAY_ID,
      senderAddr: "UQAbcdefghijklmnopqrstuvwxyz",
    });
    expect(r.status).toBe(400);
  });

  it("returns 400 when memo is empty", async () => {
    vi.mocked(prisma.payment.findUnique).mockResolvedValue({
      ...basePayment,
      status: PaymentStatus.pending,
      rail: PaymentRail.web,
      tonAmount: 1,
      destinationWallet: "UQDest_________________________________",
      memo: "   ",
    } as never);
    const r = await post({
      paymentId: PAY_ID,
      senderAddr: "UQAbcdefghijklmnopqrstuvwxyz",
    });
    expect(r.status).toBe(400);
  });

  it("returns transfer payload from TON Pay on success", async () => {
    vi.mocked(prisma.payment.findUnique).mockResolvedValue({
      ...basePayment,
      status: PaymentStatus.pending,
      rail: PaymentRail.web,
      tonAmount: 1.5,
      destinationWallet: "UQDest_________________________________",
      memo: "ODELPay HUB memo",
    } as never);

    const r = await post({
      paymentId: PAY_ID,
      senderAddr: "UQAbcdefghijklmnopqrstuvwxyz",
    });
    expect(r.status).toBe(200);
    const j = (await r.json()) as { message: unknown; reference: string; bodyBase64Hash: string };
    expect(j.reference).toBe("ref-1");
    expect(j.bodyBase64Hash).toBe("hash");
    expect(j.message).toEqual({ address: "x", amount: "1", payload: "p" });
    expect(createTonPayTransfer).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 1.5,
        recipientAddr: "UQDest_________________________________",
        senderAddr: "UQAbcdefghijklmnopqrstuvwxyz",
        commentToSender: "ODELPay HUB memo",
      }),
      { apiKey: "test" }
    );
  });
});
