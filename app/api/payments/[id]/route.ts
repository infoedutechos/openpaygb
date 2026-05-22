import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAdminFromCookies } from "@/lib/auth";
import { organizationWhereForSession } from "@/lib/admin-org-scope";
import { isValidObjectId } from "@/lib/object-id";
import { handleFirstTimeConfirmation } from "@/lib/on-payment-confirmed";
import { isAdminManualPaymentConfirmAllowed } from "@/lib/admin-payment-confirm-policy";
import { buildStudentProgrammeProgress } from "@/lib/tuition-progress";

const PatchBody = z
  .object({
    status: z.enum(["pending", "confirmed", "failed"]).optional(),
    txHash: z.string().max(220).optional(),
    momoReference: z.string().max(200).optional(),
  })
  .refine(
    (d) => d.status !== undefined || d.txHash !== undefined || d.momoReference !== undefined,
    { message: "Provide at least one of: status, txHash, momoReference" }
  );

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const admin = await getAdminFromCookies();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await ctx.params;
  if (!isValidObjectId(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  const orgWhere = await organizationWhereForSession(admin.sub, admin.role);
  const p = await prisma.payment.findFirst({
    where: { id, ...orgWhere },
    include: {
      student: { select: { id: true, name: true, email: true } },
      organization: { select: { slug: true, name: true } },
    },
  });
  if (!p) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  /** Build per-student programme progress so the admin "view single payment" surface mirrors the list/receipts. */
  const programme = await prisma.programme.findUnique({
    where: { organizationId_code: { organizationId: p.organizationId, code: p.programmeCode } },
    include: { fees: true },
  });
  const studentPayments = await prisma.payment.findMany({
    where: { studentId: p.student.id, programmeCode: p.programmeCode, organizationId: p.organizationId },
  });
  const progress = programme
    ? buildStudentProgrammeProgress(programme, studentPayments)
    : null;

  return NextResponse.json({
    payment: {
      id: p.id,
      student: { name: p.student.name, email: p.student.email },
      organizationSlug: p.organization.slug,
      organizationName: p.organization.name,
      programmeCode: p.programmeCode,
      programmeName: programme?.name ?? null,
      year: p.year,
      semester: p.semester,
      tuitionUgx: p.tuitionUgx,
      functionalFeesUgx: p.functionalFeesUgx,
      totalUgx: p.totalUgx,
      ugxPerTonSnapshot: p.ugxPerTonSnapshot,
      tonAmount: p.tonAmount,
      destinationWallet: p.destinationWallet,
      rail: p.rail,
      status: p.status,
      txHash: p.txHash,
      memo: p.memo,
      momoReference: p.momoReference,
      createdAt: p.createdAt,
      confirmedAt: p.confirmedAt,
      progress,
    },
  });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const admin = await getAdminFromCookies();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await ctx.params;
  if (!isValidObjectId(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  const json = await req.json();
  const parsed = PatchBody.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const orgWhere = await organizationWhereForSession(admin.sub, admin.role);
  const existing = await prisma.payment.findFirst({ where: { id, ...orgWhere } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const data: {
    momoReference?: string;
    txHash?: string;
    status?: "pending" | "confirmed" | "failed";
    confirmedAt?: Date | null;
  } = {};
  if (parsed.data.momoReference !== undefined) {
    data.momoReference =
      parsed.data.momoReference.trim() === "" ? "" : parsed.data.momoReference.trim();
  }
  if (parsed.data.txHash !== undefined) {
    data.txHash = parsed.data.txHash;
  }
  if (parsed.data.status !== undefined) {
    data.status = parsed.data.status;
    data.confirmedAt = parsed.data.status === "confirmed" ? new Date() : null;
  }

  const wantsConfirm =
    parsed.data.status === "confirmed" && existing.status !== "confirmed";
  if (wantsConfirm && !isAdminManualPaymentConfirmAllowed()) {
    return NextResponse.json(
      {
        error: "Manual confirmation is disabled",
        hint: "Payments are confirmed by TON cron and MoMo webhooks only. Set ADMIN_MANUAL_PAYMENT_CONFIRM=true temporarily for edge-case overrides.",
      },
      { status: 403 }
    );
  }

  const payment = await prisma.payment.update({
    where: { id },
    data,
  });

  if (parsed.data.status === "confirmed" && existing.status !== "confirmed") {
    handleFirstTimeConfirmation(payment);
  }

  return NextResponse.json({
    payment: {
      id: payment.id,
      status: payment.status,
      txHash: payment.txHash,
      momoReference: payment.momoReference,
      confirmedAt: payment.confirmedAt,
    },
  });
}
