import { NextResponse } from "next/server";
import { z } from "zod";
import { PaymentRail } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { assertActiveOrganizationSlug } from "@/lib/organizations";
import { createPendingPayment } from "@/lib/create-payment";
import { assertCanStartCheckoutPayment } from "@/lib/tuition-balance";
import { assertCheckoutStudentAccess } from "@/lib/checkout-session";
import { clientIp, rateLimitHit } from "@/lib/rate-limit";

const Body = z.object({
  organizationSlug: z.string().min(2),
  studentId: z.string().min(1),
  programmeCode: z.string().min(2),
  year: z.number().int().min(1).max(6),
  semester: z.number().int().min(1).max(3),
  rail: z.nativeEnum(PaymentRail),
  memo: z.string().max(200).optional(),
  feeSelectionMode: z.enum(["semester", "year"]).optional(),
  feeIds: z
    .array(z.string().regex(/^[0-9a-fA-F]{24}$/))
    .max(100)
    .optional(),
  installmentCount: z.number().int().min(1).max(4).optional(),
  installmentPlanId: z.string().min(1).optional(),
  installmentIndex: z.number().int().min(1).max(4).optional(),
});

export async function POST(req: Request) {
  try {
    const ip = clientIp(req);
    if (rateLimitHit(`checkout-pay:${ip}`, 40, 60 * 60 * 1000)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const json = await req.json().catch(() => null);
    const parsed = Body.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid body", details: parsed.error.flatten() }, { status: 400 });
    }

    const org = await assertActiveOrganizationSlug(parsed.data.organizationSlug.trim().toLowerCase());

    const student = await prisma.student.findUnique({
      where: { id: parsed.data.studentId },
    });
    if (!student || student.organizationId !== org.id) {
      return NextResponse.json({ error: "Student not found for this school" }, { status: 404 });
    }

    const access = await assertCheckoutStudentAccess({
      req,
      studentId: student.id,
      organizationId: student.organizationId,
    });
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const guard = await assertCanStartCheckoutPayment({
      studentId: student.id,
      programmeCode: parsed.data.programmeCode,
      year: parsed.data.year,
      semester: parsed.data.semester,
      feeSelectionMode: parsed.data.feeSelectionMode ?? "semester",
      feeIds: parsed.data.feeIds,
      installmentPlanId: parsed.data.installmentPlanId,
      installmentIndex: parsed.data.installmentIndex,
    });
    if (!guard.ok) {
      return NextResponse.json({ error: guard.error }, { status: 409 });
    }

    const doc = await createPendingPayment({
      studentId: student.id,
      programmeCode: parsed.data.programmeCode,
      year: parsed.data.year,
      semester: parsed.data.semester,
      rail: parsed.data.rail,
      memo: parsed.data.memo?.trim() || undefined,
      feeSelectionMode: parsed.data.feeSelectionMode,
      feeIds: parsed.data.feeIds,
      installmentCount: parsed.data.installmentCount,
      installmentIndex: guard.installmentIndex ?? parsed.data.installmentIndex ?? 1,
      installmentPlanId: guard.installmentPlanId ?? parsed.data.installmentPlanId,
    });

    return NextResponse.json(
      {
        payment: {
          id: doc.id,
          studentId: doc.studentId,
          programmeCode: doc.programmeCode,
          year: doc.year,
          semester: doc.semester,
          tuitionUgx: doc.tuitionUgx,
          functionalFeesUgx: doc.functionalFeesUgx,
          totalUgx: doc.totalUgx,
          platformFeeUgx: doc.platformFeeUgx,
          feeSelectionMode: doc.feeSelectionMode,
          includedFeeIds: doc.includedFeeIds,
          ugxPerTonSnapshot: doc.ugxPerTonSnapshot,
          tonAmount: doc.tonAmount,
          destinationWallet: doc.destinationWallet,
          rail: doc.rail,
          status: doc.status,
          memo: doc.memo,
          momoReference: doc.momoReference,
          createdAt: doc.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not create payment";
    let status = 500;
    if (msg.includes("not active") || msg.includes("not found")) status = 404;
    else     if (
      msg.includes("Programme not found") ||
      msg.includes("No fee schedule") ||
      msg.includes("Invalid") ||
      msg.includes("Installment plan not found")
    )
      status = 400;
    if (status === 500) console.error("[checkout/payment]", e);
    return NextResponse.json({ error: msg }, { status });
  }
}
