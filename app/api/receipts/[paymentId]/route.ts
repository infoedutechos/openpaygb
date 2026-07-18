import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminFromCookies } from "@/lib/auth";
import { isValidObjectId } from "@/lib/object-id";
import { buildStudentProgrammeProgress, getProgrammeDurationSummary } from "@/lib/tuition-progress";
import { buildReceiptBreakdown } from "@/lib/receipt-lines";
import { buildReceiptLedger } from "@/lib/receipt-ledger";
import { createReceiptAccessToken } from "@/lib/receipt-access";
import { receiptAccessFromRequest } from "@/lib/receipt-request-auth";
import { clientIp, rateLimitHit } from "@/lib/rate-limit";
import { apiErrorResponse } from "@/lib/api-error";

/** Receipt JSON — confirmed payments need admin, student owner, or signed `?t=` token. */
export async function GET(req: Request, ctx: { params: Promise<{ paymentId: string }> }) {
  try {
  if (rateLimitHit(`receipt-json:${clientIp(req)}`, 60, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
  const { paymentId } = await ctx.params;
  if (!isValidObjectId(paymentId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  const admin = await getAdminFromCookies();
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { student: { select: { id: true, name: true } } },
  });
  if (!payment) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (payment.status !== "confirmed" && !admin) {
    return NextResponse.json({ error: "Receipt not available" }, { status: 404 });
  }
  if (payment.status === "confirmed" && !(await receiptAccessFromRequest(payment, req))) {
    return NextResponse.json({ error: "Receipt not available" }, { status: 404 });
  }
  const issuedAt = payment.confirmedAt ?? payment.createdAt;

  const programme = await prisma.programme.findUnique({
    where: { organizationId_code: { organizationId: payment.organizationId, code: payment.programmeCode } },
    include: { fees: true },
  });
  const studentPayments = programme
    ? await prisma.payment.findMany({
        where: {
          studentId: payment.student.id,
          programmeCode: payment.programmeCode,
          organizationId: payment.organizationId,
        },
      })
    : [];
  const progress = programme ? buildStudentProgrammeProgress(programme, studentPayments) : null;
  const programmeDuration = programme ? getProgrammeDurationSummary(programme) : null;
  const organization = await prisma.organization.findUnique({
    where: { id: payment.organizationId },
    select: { name: true, institutionTier: true },
  });
  const institutionTier = organization?.institutionTier;
  const breakdown = buildReceiptBreakdown(payment, programme?.fees ?? [], institutionTier);
  const ledger = buildReceiptLedger({
    organizationName: organization?.name ?? "ODEL HUB",
    studentName: payment.student.name ?? "Student",
    programmeName: programme?.name ?? payment.programmeCode,
    programmeCode: payment.programmeCode,
    payments: studentPayments,
    programmeFees: programme?.fees ?? [],
    focusPaymentId: payment.id,
    institutionTier,
  });
  const { getReceiptBranding } = await import("@/lib/receipt-branding");
  const branding = await getReceiptBranding(payment.organizationId);

  return NextResponse.json({
    receipt: {
      paymentId: payment.id,
      studentName: payment.student.name,
      programmeCode: payment.programmeCode,
      programmeName: programme?.name ?? null,
      programmeDuration,
      year: payment.year,
      semester: payment.semester,
      tuitionUgx: payment.tuitionUgx,
      functionalFeesUgx: payment.functionalFeesUgx,
      platformFeeUgx: payment.platformFeeUgx ?? 0,
      totalUgx: payment.totalUgx,
      tonAmount: payment.tonAmount,
      ugxPerTonSnapshot: payment.ugxPerTonSnapshot,
      txHash: payment.txHash,
      destinationWallet: payment.destinationWallet,
      issuedAt,
      progress,
      feeBreakdown: breakdown,
      ledger,
      branding,
      verificationUrl: `/receipt/${payment.id}`,
      receiptAccessToken: createReceiptAccessToken({
        id: payment.id,
        studentId: payment.studentId,
        confirmedAt: payment.confirmedAt,
      }),
    },
  });
  } catch (e) {
    return apiErrorResponse(e, { route: "receipts", fallback: "Could not load receipt" });
  }
}
