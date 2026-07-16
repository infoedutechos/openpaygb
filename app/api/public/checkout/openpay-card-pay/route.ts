import { NextResponse } from "next/server";
import { z } from "zod";
import { assertActiveOrganizationSlug } from "@/lib/organizations";
import { upsertCheckoutStudent } from "@/lib/checkout-student";
import {
  assertCheckoutStudentAccess,
  attachCheckoutSessionCookie,
  signCheckoutSession,
} from "@/lib/checkout-session";
import { assertCanStartCheckoutPayment } from "@/lib/tuition-balance";
import { payTuitionFromOpenPayCard } from "@/lib/openpay-card";
import { getOpenPayCardPlatformSettings } from "@/lib/openpay-card-settings";
import { clientIp, rateLimitHit } from "@/lib/rate-limit";
import { apiErrorResponse } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";

const Body = z
  .object({
    organizationSlug: z.string().min(2),
    studentId: z.string().min(1).optional(),
    name: z.string().min(2).optional(),
    email: z.string().email().optional().or(z.literal("")),
    programmeCode: z.string().min(2),
    year: z.number().int().min(1).max(6),
    semester: z.number().int().min(1).max(3),
    feeSelectionMode: z.enum(["semester", "year", "programme"]).optional(),
    feeIds: z.array(z.string().regex(/^[0-9a-fA-F]{24}$/)).max(100).optional(),
    installmentCount: z.number().int().min(1).max(4).optional(),
    installmentPlanId: z.string().min(1).optional(),
    installmentIndex: z.number().int().min(1).max(4).optional(),
  })
  .superRefine((val, ctx) => {
    if (!val.studentId?.trim() && !val.name?.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "name is required when studentId is omitted", path: ["name"] });
    }
  });

/** Pay tuition from OpenPayGB platform card balance (student must have active card + sufficient UGX). */
export async function POST(req: Request) {
  try {
    const settings = await getOpenPayCardPlatformSettings();
    if (!settings.enabled) {
      return NextResponse.json({ error: "OpenPayGB card payments are disabled", code: "openpay_card_disabled" }, { status: 503 });
    }

    if (rateLimitHit(`checkout-openpay-card:${clientIp(req)}`, 30, 60 * 60 * 1000)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const json = await req.json().catch(() => null);
    const parsed = Body.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid body", details: parsed.error.flatten() }, { status: 400 });
    }

    const d = parsed.data;
    await assertActiveOrganizationSlug(d.organizationSlug.trim().toLowerCase());

    let studentId: string;
    let checkoutToken: string | undefined;
    if (d.studentId?.trim()) {
      const st = await prisma.student.findUnique({ where: { id: d.studentId.trim() } });
      if (!st) {
        return NextResponse.json({ error: "Student not found" }, { status: 404 });
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
    } else {
      const org = await assertActiveOrganizationSlug(d.organizationSlug.trim().toLowerCase());
      const { student } = await upsertCheckoutStudent({
        organizationId: org.id,
        name: d.name!,
        email: d.email,
        phone: "",
        programmeCode: d.programmeCode,
        year: d.year,
        semester: d.semester,
      });
      studentId = student.id;
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

    const result = await payTuitionFromOpenPayCard({
      studentId,
      programmeCode: d.programmeCode,
      year: d.year,
      semester: d.semester,
      feeSelectionMode: d.feeSelectionMode,
      feeIds: d.feeIds,
      installmentCount: d.installmentCount,
      installmentPlanId: guard.installmentPlanId ?? d.installmentPlanId,
      installmentIndex: guard.installmentIndex ?? d.installmentIndex,
    });

    const res = NextResponse.json(
      {
        ...(checkoutToken ? { checkoutToken } : {}),
        payment: {
          id: result.payment.id,
          studentId: result.payment.studentId,
          programmeCode: result.payment.programmeCode,
          year: result.payment.year,
          semester: result.payment.semester,
          totalUgx: result.payment.totalUgx,
          platformFeeUgx: result.payment.platformFeeUgx,
          tonAmount: result.payment.tonAmount,
          rail: result.payment.rail,
          status: result.payment.status,
          createdAt: result.payment.createdAt,
        },
        openPayCard: {
          balanceUgx: result.cardBalanceUgx,
        },
      },
      { status: 201 },
    );
    if (checkoutToken) await attachCheckoutSessionCookie(res, checkoutToken);
    return res;
  } catch (e) {
    return apiErrorResponse(e, {
      route: "checkout/openpay-card-pay",
      fallback: "Could not pay with OpenPayGB card",
    });
  }
}
