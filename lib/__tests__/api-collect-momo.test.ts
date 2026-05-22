import { describe, it, expect, vi, beforeEach } from "vitest";
import { PaymentRail } from "@prisma/client";

vi.mock("@/lib/rate-limit", () => ({
  clientIp: () => "10.0.0.2",
  rateLimitHit: () => false,
}));

vi.mock("@/lib/organizations", () => ({
  assertActiveOrganizationSlug: vi.fn(),
}));

vi.mock("@/lib/checkout-student", () => ({
  upsertCheckoutStudent: vi.fn(),
}));

vi.mock("@/lib/tuition-balance", () => ({
  assertCanStartCheckoutPayment: vi.fn(),
}));

vi.mock("@/lib/create-payment", () => ({
  createPendingPayment: vi.fn(),
}));

import { POST } from "@/app/api/collect/momo/route";
import { upsertCheckoutStudent } from "@/lib/checkout-student";
import { createPendingPayment } from "@/lib/create-payment";
import { assertCanStartCheckoutPayment } from "@/lib/tuition-balance";
import { assertActiveOrganizationSlug } from "@/lib/organizations";

const validBody = {
  name: "Jane Doe",
  email: "jane@school.edu",
  phone: "256700000000",
  programmeCode: "CS101",
  year: 1,
  semester: 1,
};

async function postJson(body: unknown) {
  return POST(
    new Request("http://localhost/api/collect/momo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

describe("POST /api/collect/momo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(assertActiveOrganizationSlug).mockResolvedValue({
      id: "org-default",
      slug: "default",
    } as Awaited<ReturnType<typeof assertActiveOrganizationSlug>>);
    vi.mocked(upsertCheckoutStudent).mockResolvedValue({
      student: { id: "stu-new" } as never,
      created: true,
    });
    vi.mocked(assertCanStartCheckoutPayment).mockResolvedValue({ ok: true });
    vi.mocked(createPendingPayment).mockResolvedValue({
      id: "pay-new",
      studentId: "stu-new",
      programmeCode: "CS101",
      year: 1,
      semester: 1,
      tuitionUgx: 400,
      functionalFeesUgx: 100,
      totalUgx: 500,
      platformFeeUgx: 0,
      feeSelectionMode: "semester",
      includedFeeIds: [],
      ugxPerTonSnapshot: 250_000,
      tonAmount: 0.002,
      destinationWallet: "UQw",
      rail: PaymentRail.momo_bridge,
      status: "pending",
      memo: "m",
      momoReference: "",
      createdAt: new Date(),
    });
  });

  it("returns 400 for invalid body", async () => {
    const r = await postJson({ name: "x" });
    expect(r.status).toBe(400);
  });

  it("returns 201 with payment and collect hints", async () => {
    const r = await postJson(validBody);
    expect(r.status).toBe(201);
    const j = (await r.json()) as {
      payment: { id: string; momoReference: string };
      collect: { ok: boolean; message: string };
    };
    expect(j.payment.id).toBe("pay-new");
    expect(j.collect.ok).toBeDefined();
    expect(createPendingPayment).toHaveBeenCalled();
  });
});
