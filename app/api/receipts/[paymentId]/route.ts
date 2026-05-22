import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminFromCookies } from "@/lib/auth";
import { isValidObjectId } from "@/lib/object-id";

/** Public receipt for confirmed payments; admins may preview any status. */
export async function GET(_req: Request, ctx: { params: Promise<{ paymentId: string }> }) {
  const { paymentId } = await ctx.params;
  if (!isValidObjectId(paymentId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  const admin = await getAdminFromCookies();
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { student: { select: { name: true } } },
  });
  if (!payment) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (payment.status !== "confirmed" && !admin) {
    return NextResponse.json({ error: "Receipt not available" }, { status: 404 });
  }
  const issuedAt = payment.confirmedAt ?? payment.createdAt;
  return NextResponse.json({
    receipt: {
      paymentId: payment.id,
      studentName: payment.student.name,
      programmeCode: payment.programmeCode,
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
      verificationUrl: `/receipt/${payment.id}`,
      note: "QR and PDF delivery can be wired to this payload.",
    },
  });
}
