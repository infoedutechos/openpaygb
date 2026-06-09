import "server-only";

import { prisma } from "@/lib/prisma";
import { getPublicOrigin } from "@/lib/public-url";

export const PAYMENT_REQUEST_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export type CreatePaymentRequestInput = {
  organizationId: string;
  createdByAdminId: string;
  studentId?: string | null;
  amountUgx: number;
  memo?: string;
  programmeCode?: string;
  year?: number;
  semester?: number;
  feeSelectionMode?: string;
};

export function paymentRequestPayPath(organizationSlug: string, requestId: string, studentId?: string | null): string {
  const q = new URLSearchParams({ request: requestId });
  if (studentId) q.set("studentId", studentId);
  return `/pay/${encodeURIComponent(organizationSlug)}?${q.toString()}`;
}

export function paymentRequestPayUrl(
  organizationSlug: string,
  requestId: string,
  studentId?: string | null,
): string {
  const origin = getPublicOrigin() || "";
  const path = paymentRequestPayPath(organizationSlug, requestId, studentId);
  return origin ? `${origin}${path}` : path;
}

export async function createPaymentRequest(input: CreatePaymentRequestInput) {
  const amountUgx = Math.round(input.amountUgx);
  if (amountUgx <= 0) throw new Error("Amount must be positive");

  return prisma.paymentRequest.create({
    data: {
      organizationId: input.organizationId,
      createdByAdminId: input.createdByAdminId,
      studentId: input.studentId ?? null,
      amountUgx,
      memo: (input.memo ?? "").trim(),
      programmeCode: (input.programmeCode ?? "").trim().toUpperCase(),
      year: input.year ?? 1,
      semester: input.semester ?? 1,
      feeSelectionMode: input.feeSelectionMode ?? "semester",
      expiresAt: new Date(Date.now() + PAYMENT_REQUEST_TTL_MS),
    },
  });
}

export async function getActivePaymentRequest(id: string) {
  const row = await prisma.paymentRequest.findUnique({ where: { id } });
  if (!row || row.status !== "pending") return null;
  if (row.expiresAt.getTime() < Date.now()) return null;
  return row;
}

export async function markPaymentRequestPaid(id: string, paymentId: string) {
  await prisma.paymentRequest.updateMany({
    where: { id, status: "pending" },
    data: { status: "paid", paidPaymentId: paymentId },
  });
}
