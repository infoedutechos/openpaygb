import { describe, it, expect, vi, beforeEach } from "vitest";
import { PaymentRail } from "@prisma/client";

vi.mock("@/lib/rate-limit", () => ({
  clientIp: () => "10.0.0.1",
  rateLimitHit: () => false,
}));

vi.mock("@/lib/organizations", () => ({
  assertActiveOrganizationSlug: vi.fn(),
}));

vi.mock("@/lib/create-payment", () => ({
  createPendingPayment: vi.fn(),
}));

vi.mock("@/lib/tuition-balance", () => ({
  assertCanStartCheckoutPayment: vi.fn(),
}));

vi.mock("@/lib/checkout-session", () => ({
  assertCheckoutStudentAccess: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    student: {
      findUnique: vi.fn(),
    },
  },
}));

import { POST } from "@/app/api/public/checkout/payment/route";
import { prisma } from "@/lib/prisma";
import { createPendingPayment } from "@/lib/create-payment";
import { assertCanStartCheckoutPayment } from "@/lib/tuition-balance";
import { assertCheckoutStudentAccess } from "@/lib/checkout-session";
import { assertActiveOrganizationSlug } from "@/lib/organizations";

const baseBody = {
  organizationSlug: "default",
  studentId: "stu-1",
  programmeCode: "CS101",
  year: 1,
  semester: 1,
  rail: PaymentRail.web,
};

async function postJson(body: unknown) {
  return POST(
    new Request("http://localhost/api/public/checkout/payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
  );
}

describe("POST /api/public/checkout/payment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(assertCheckoutStudentAccess).mockResolvedValue({ ok: true });
    vi.mocked(assertCanStartCheckoutPayment).mockResolvedValue({ ok: true });
    vi.mocked(assertActiveOrganizationSlug).mockResolvedValue({
      id: "org-1",
      slug: "default",
    } as Awaited<ReturnType<typeof assertActiveOrganizationSlug>>);
    vi.mocked(prisma.student.findUnique).mockResolvedValue({
      id: "stu-1",
      organizationId: "org-1",
    } as never);
    vi.mocked(createPendingPayment).mockResolvedValue({
      id: "pay-1",
      studentId: "stu-1",
      programmeCode: "CS101",
      year: 1,
      semester: 1,
      tuitionUgx: 100,
      functionalFeesUgx: 50,
      totalUgx: 150,
      platformFeeUgx: 0,
      feeSelectionMode: "semester",
      includedFeeIds: [],
      ugxPerTonSnapshot: 250_000,
      tonAmount: 0.0006,
      destinationWallet: "UQtest",
      rail: PaymentRail.web,
      status: "pending",
      memo: "m · ref:pay-1",
      momoReference: "",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
    });
  });

  it("returns 400 for invalid JSON", async () => {
    const r = await POST(
      new Request("http://localhost/api/public/checkout/payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "not-json{",
      })
    );
    expect(r.status).toBe(400);
  });

  it("returns 400 for invalid body", async () => {
    const r = await postJson({});
    expect(r.status).toBe(400);
    const j = (await r.json()) as { error: string };
    expect(j.error).toBe("Invalid body");
  });

  it("returns 404 when student is missing", async () => {
    vi.mocked(prisma.student.findUnique).mockResolvedValue(null);
    const r = await postJson(baseBody);
    expect(r.status).toBe(404);
  });

  it("returns 404 when student belongs to another organization", async () => {
    vi.mocked(prisma.student.findUnique).mockResolvedValue({
      id: "stu-1",
      organizationId: "other-org",
    } as never);
    const r = await postJson(baseBody);
    expect(r.status).toBe(404);
  });

  it("returns 201 and payment on success", async () => {
    const r = await postJson(baseBody);
    expect(r.status).toBe(201);
    const j = (await r.json()) as { payment: { id: string; totalUgx: number; rail: string } };
    expect(j.payment.id).toBe("pay-1");
    expect(j.payment.totalUgx).toBe(150);
    expect(j.payment.rail).toBe("web");
    expect(createPendingPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        studentId: "stu-1",
        programmeCode: "CS101",
        rail: PaymentRail.web,
      })
    );
  });
});
