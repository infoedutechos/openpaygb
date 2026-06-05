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
import { apiErrorResponse, resolveApiError } from "@/lib/api-error";
import {
  isRelworxConfigured,
  RelworxApiError,
  relworxCustomerReference,
  relworxNotConfiguredMessage,
  relworxRequestPayment,
  relworxUserMessage,
} from "@/lib/relworx/client";

const E164 = z.string().regex(/^\+\d{10,15}$/, "Use international format with + (E.164)");

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
    phone: E164,
  })
  .superRefine((val, ctx) => {
    if (!val.studentId?.trim() && !val.name?.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "name is required when studentId is omitted", path: ["name"] });
    }
  });

/** Mobile money collect via Relworx v2. Webhook: POST /api/webhooks/relworx */
export async function POST(req: Request) {
  try {
    if (!isRelworxConfigured()) {
      return NextResponse.json(
        { error: relworxNotConfiguredMessage(), code: "relworx_not_configured" },
        { status: 503 },
      );
    }

    if (rateLimitHit(`checkout-relworx:${clientIp(req)}`, 25, 60 * 60 * 1000)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const json = await req.json().catch(() => null);
    const parsed = Body.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid body", details: parsed.error.flatten() }, { status: 400 });
    }

    const d = parsed.data;
    const org = await assertActiveOrganizationSlug(d.organizationSlug.trim().toLowerCase());

    let studentId: string;
    let checkoutToken: string | undefined;
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
      await prisma.student.update({ where: { id: studentId }, data: { phone: d.phone } });
    } else {
      const { student } = await upsertCheckoutStudent({
        organizationId: org.id,
        name: d.name!,
        email: d.email,
        phone: d.phone,
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

    const doc = await createPendingPayment({
      studentId,
      programmeCode: d.programmeCode,
      year: d.year,
      semester: d.semester,
      rail: PaymentRail.relworx,
      feeSelectionMode: d.feeSelectionMode,
      feeIds: d.feeIds,
      installmentCount: d.installmentCount,
      installmentIndex: guard.installmentIndex ?? d.installmentIndex ?? 1,
      installmentPlanId: guard.installmentPlanId ?? d.installmentPlanId,
    });

    const reference = relworxCustomerReference(doc.id);

    let collect;
    try {
      collect = await relworxRequestPayment({
        msisdn: d.phone,
        amount: doc.totalUgx,
        reference,
        description: `ODEL HUB ${org.slug} tuition`,
      });
    } catch (e) {
      await prisma.payment.deleteMany({ where: { id: doc.id, status: "pending" } }).catch(() => {});
      const notConfigured = e instanceof Error && /not configured/i.test(e.message);
      const userMsg = relworxUserMessage(e);
      const r = resolveApiError(new Error(userMsg), {
        route: "checkout/relworx-start/collect",
        fallback: "Could not start Relworx collection",
      });
      const status = notConfigured
        ? 503
        : e instanceof RelworxApiError && e.httpStatus >= 400 && e.httpStatus < 500
          ? e.httpStatus
          : r.status < 500
            ? r.status
            : 502;
      if (r.shouldLog) console.error("[checkout/relworx-start/collect]", e);
      const code = notConfigured
        ? "relworx_not_configured"
        : /allowlist|not authorized|IP/i.test(userMsg)
          ? "relworx_ip_not_allowed"
          : /rate|10 minutes/i.test(userMsg)
            ? "relworx_rate_limited"
            : "relworx_collect_failed";
      return NextResponse.json({ ...r.body, code }, { status });
    }

    const internalRef = collect.internal_reference?.trim() ?? "";
    await prisma.payment.update({
      where: { id: doc.id },
      data: { momoReference: internalRef || reference },
    });

    const payment = await prisma.payment.findUniqueOrThrow({ where: { id: doc.id } });

    const res = NextResponse.json(
      {
        ...(checkoutToken ? { checkoutToken } : {}),
        payment: {
          id: payment.id,
          studentId: payment.studentId,
          programmeCode: payment.programmeCode,
          year: payment.year,
          semester: payment.semester,
          totalUgx: payment.totalUgx,
          platformFeeUgx: payment.platformFeeUgx,
          tonAmount: payment.tonAmount,
          rail: payment.rail,
          status: payment.status,
          momoReference: payment.momoReference,
          createdAt: payment.createdAt,
        },
        relworx: {
          message: collect.message,
          internalReference: collect.internal_reference ?? null,
          reference,
        },
      },
      { status: 201 },
    );
    if (checkoutToken) attachCheckoutSessionCookie(res, checkoutToken);
    return res;
  } catch (e) {
    return apiErrorResponse(e, {
      route: "checkout/relworx-start",
      fallback: "Could not start Relworx payment",
    });
  }
}
