import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { PaymentRail } from "@prisma/client";

vi.mock("@/lib/rate-limit", () => ({
  clientIp: () => "10.0.0.3",
  rateLimitHit: () => false,
}));

vi.mock("@/lib/momo/find-payment", () => ({
  findPaymentByMomoReference: vi.fn(),
}));

vi.mock("@/lib/on-payment-confirmed", () => ({
  handleFirstTimeConfirmation: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    payment: {
      updateMany: vi.fn(),
      findUniqueOrThrow: vi.fn(),
    },
  },
}));

import { GET, POST } from "@/app/api/webhooks/momo/route";
import { prisma } from "@/lib/prisma";
import { findPaymentByMomoReference } from "@/lib/momo/find-payment";
import { handleFirstTimeConfirmation } from "@/lib/on-payment-confirmed";

const PAY_ID = "507f1f77bcf86cd799439011";

function post(body: unknown, headers?: Record<string, string>) {
  return POST(
    new Request("http://localhost/api/webhooks/momo", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: typeof body === "string" ? body : JSON.stringify(body),
    })
  );
}

describe("GET /api/webhooks/momo", () => {
  it("returns 200 OK for provider probe", () => {
    const r = GET();
    expect(r.status).toBe(200);
  });
});

describe("POST /api/webhooks/momo", () => {
  let prevSecret: string | undefined;

  beforeEach(() => {
    vi.clearAllMocks();
    prevSecret = process.env.MOMO_WEBHOOK_SECRET;
    delete process.env.MOMO_WEBHOOK_SECRET;
  });

  afterEach(() => {
    if (prevSecret === undefined) delete process.env.MOMO_WEBHOOK_SECRET;
    else process.env.MOMO_WEBHOOK_SECRET = prevSecret;
  });

  it("returns 401 when webhook secret is set and header is missing", async () => {
    process.env.MOMO_WEBHOOK_SECRET = "only-providers";
    const r = await post({ referenceId: PAY_ID, status: "SUCCESSFUL" });
    expect(r.status).toBe(401);
  });

  it("returns 401 when webhook secret does not match", async () => {
    process.env.MOMO_WEBHOOK_SECRET = "only-providers";
    const r = await post({ referenceId: PAY_ID, status: "SUCCESSFUL" }, { "x-momo-webhook-secret": "wrong" });
    expect(r.status).toBe(401);
  });

  it("returns 400 when body is not JSON object", async () => {
    const r = await post("not-json", { "content-type": "application/json" });
    expect(r.status).toBe(400);
  });

  it("returns no_reference when payload has no reference fields", async () => {
    const r = await post({ status: "SUCCESSFUL" });
    expect(r.status).toBe(200);
    expect(await r.json()).toMatchObject({ ok: true, action: "no_reference" });
  });

  it("returns unknown_reference when payment not found", async () => {
    vi.mocked(findPaymentByMomoReference).mockResolvedValue(null);
    const r = await post({ referenceId: PAY_ID, status: "SUCCESSFUL" });
    expect(r.status).toBe(200);
    expect(await r.json()).toMatchObject({ ok: true, action: "unknown_reference", reference: PAY_ID });
  });

  it("returns not_success when provider status is not success", async () => {
    vi.mocked(findPaymentByMomoReference).mockResolvedValue({
      id: PAY_ID,
      status: "pending",
      momoReference: "x",
    } as never);
    const r = await post({ referenceId: PAY_ID, status: "FAILED" });
    expect(r.status).toBe(200);
    expect(await r.json()).toMatchObject({ ok: true, action: "not_success", paymentId: PAY_ID });
  });

  it("returns already_confirmed when payment already confirmed", async () => {
    vi.mocked(findPaymentByMomoReference).mockResolvedValue({
      id: PAY_ID,
      status: "confirmed",
      momoReference: "x",
    } as never);
    const r = await post({ referenceId: PAY_ID, status: "SUCCESSFUL" });
    expect(r.status).toBe(200);
    expect(await r.json()).toMatchObject({ ok: true, action: "already_confirmed", paymentId: PAY_ID });
  });

  it("confirms pending payment and runs side effects", async () => {
    vi.mocked(findPaymentByMomoReference).mockResolvedValue({
      id: PAY_ID,
      status: "pending",
      momoReference: "ext-1",
    } as never);
    vi.mocked(prisma.payment.updateMany).mockResolvedValue({ count: 1 } as never);
    vi.mocked(prisma.payment.findUniqueOrThrow).mockResolvedValue({
      id: PAY_ID,
      rail: PaymentRail.momo_bridge,
    } as never);

    const r = await post({ referenceId: PAY_ID, status: "SUCCESSFUL" });
    expect(r.status).toBe(200);
    expect(await r.json()).toMatchObject({ ok: true, action: "confirmed", paymentId: PAY_ID });
    expect(prisma.payment.updateMany).toHaveBeenCalledWith({
      where: { id: PAY_ID, status: "pending" },
      data: expect.objectContaining({
        status: "confirmed",
        momoReference: "ext-1",
      }),
    });
    expect(handleFirstTimeConfirmation).toHaveBeenCalledTimes(1);
  });

  it("treats updateMany count 0 as already_confirmed", async () => {
    vi.mocked(findPaymentByMomoReference).mockResolvedValue({
      id: PAY_ID,
      status: "pending",
      momoReference: "",
    } as never);
    vi.mocked(prisma.payment.updateMany).mockResolvedValue({ count: 0 } as never);

    const r = await post({ referenceId: PAY_ID, status: "SUCCESSFUL" });
    expect(r.status).toBe(200);
    expect(await r.json()).toMatchObject({ ok: true, action: "already_confirmed", paymentId: PAY_ID });
    expect(handleFirstTimeConfirmation).not.toHaveBeenCalled();
  });
});
