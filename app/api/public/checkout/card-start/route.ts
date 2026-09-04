import { NextResponse } from "next/server";
import { z } from "zod";
import { PaymentRail } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { assertActiveOrganizationSlug } from "@/lib/organizations";
import { upsertCheckoutStudent } from "@/lib/checkout-student";
import { createPendingPayment } from "@/lib/create-payment";
import { assertCanStartCheckoutPayment } from "@/lib/tuition-balance";
import {
  assertCheckoutStudentAccess,
  attachCheckoutSessionCookie,
  signCheckoutSession,
} from "@/lib/checkout-session";
import { clientIp, rateLimitHit } from "@/lib/rate-limit";
import { apiErrorResponse } from "@/lib/api-error";
import {
  cardAcquiringNotConfiguredMessage,
  createCardCheckoutSession,
  isCardAcquiringConfigured,
} from "@/lib/card-acquiring";

const Body = z
  .object({
    organizationSlug: z.string().min(2),
    studentId: z.string().min(1).optional(),
    name: z.string().min(2).optional(),
    email: z.string().email(),
    programmeCode: z.string().min(2),
    year: z.number().int().min(1).max(6),
    semester: z.number().int().min(1).max(3),
    feeSelectionMode: z.enum(["semester", "year", "programme"]).optional(),
    feeIds: z.array(z.string().regex(/^[0-9a-fA-F]{24}$/)).max(100).optional(),
    installmentCount: z.number().int().min(1).max(4).optional(),
    installmentPlanId: z.string().min(1).optional(),
    installmentIndex: z.number().int().min(1).max(4).optional(),
    redirectUrl: z.string().url().optional(),
  })
  .superRefine((val, ctx) => {
    if (!val.studentId?.trim() && !val.name?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "name is required when studentId is omitted",
        path: ["name"],
      });
    }
  });

/** Hosted bank-card acquiring (Flutterwave / Paystack). Confirmed via provider webhooks. */
export async function POST(req: Request) {
  try {
    if (!isCardAcquiringConfigured()) {
      return NextResponse.json(
        { error: cardAcquiringNotConfiguredMessage(), code: "card_acquiring_not_configured" },
        { status: 503 },
      );
    }

    if (rateLimitHit(`checkout-card:${clientIp(req)}`, 25, 60 * 60 * 1000)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid body", details: parsed.error.flatten() }, { status: 400 });
    }

    const d = parsed.data;
    const org = await assertActiveOrganizationSlug(d.organizationSlug.trim().toLowerCase());

    let studentId: string;
    let checkoutToken: string | undefined;
    let customerName = d.name?.trim() || "";

    if (d.studentId?.trim()) {
      const st = await prisma.student.findUnique({ where: { id: d.studentId.trim() } });
      if (!st || st.organizationId !== org.id) {
        return NextResponse.json({ error: "Student not found for this school" }, { status: 404 });
      }
      const access = await assertCheckoutStudentAccess({
        req,
        studentId: st.id,
        organizationId: st.organizationId,
      });
      if (!access.ok) {
        return NextResponse.json({ error: access.error }, { status: access.status });
      }
      studentId = st.id;
      customerName = st.name || customerName;
      if (d.email) {
        await prisma.student.update({ where: { id: studentId }, data: { email: d.email.trim().toLowerCase() } });
      }
    } else {
      const { student } = await upsertCheckoutStudent({
        organizationId: org.id,
        name: d.name!,
        email: d.email,
        programmeCode: d.programmeCode,
        year: d.year,
        semester: d.semester,
      });
      studentId = student.id;
      customerName = student.name;
      checkoutToken = await signCheckoutSession({ sub: student.id, organizationId: org.id });
    }

    const guard = await assertCanStartCheckoutPayment({
      studentId,
      programmeCode: d.programmeCode,
      year: d.year,
      semester: d.semester,
      feeSelectionMode: d.feeSelectionMode ?? "semester",
      feeIds: d.feeIds,
      installmentPlanId: d.installmentPlanId,
      installmentIndex: d.installmentIndex,
    });
    if (!guard.ok) {
      return NextResponse.json({ error: guard.error }, { status: 409 });
    }

    const doc = await createPendingPayment({
      studentId,
      programmeCode: d.programmeCode,
      year: d.year,
      semester: d.semester,
      rail: PaymentRail.card,
      feeSelectionMode: d.feeSelectionMode,
      feeIds: d.feeIds,
      installmentCount: d.installmentCount,
      installmentIndex: guard.installmentIndex ?? d.installmentIndex ?? 1,
      installmentPlanId: guard.installmentPlanId ?? d.installmentPlanId,
    });

    const origin = new URL(req.url).origin;
    const redirectUrl =
      d.redirectUrl || `${origin}/pay/status?paymentId=${doc.id}&org=${encodeURIComponent(org.slug)}`;

    let session;
    try {
      session = await createCardCheckoutSession({
        paymentId: doc.id,
        amountUgx: doc.totalUgx,
        email: d.email,
        customerName,
        redirectUrl,
      });
    } catch (e) {
      await prisma.payment.deleteMany({ where: { id: doc.id, status: "pending" } }).catch(() => {});
      throw e;
    }

    await prisma.payment.update({
      where: { id: doc.id },
      data: {
        momoReference: session.providerReference,
        memo: `card:${session.provider}`,
      },
    });

    const res = NextResponse.json(
      {
        ...(checkoutToken ? { checkoutToken } : {}),
        paymentId: doc.id,
        provider: session.provider,
        authorizationUrl: session.authorizationUrl,
        providerReference: session.providerReference,
        totalUgx: doc.totalUgx,
      },
      { status: 201 },
    );
    if (checkoutToken) await attachCheckoutSessionCookie(res, checkoutToken);
    return res;
  } catch (e) {
    return apiErrorResponse(e, {
      route: "POST /api/public/checkout/card-start",
      fallback: "Could not start card payment",
    });
  }
}
