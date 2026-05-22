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
import { isMbiyoConfigured, mbiyoMerchantPayin, mbiyoNotConfiguredMessage } from "@/lib/mbiyo/client";
import { convertUgxToCurrency } from "@/lib/mbiyo/convert-ugx";
import {
  findMbiyoCountry,
  isMbiyoCountrySupported,
  mbiyoCurrencyForCountry,
  mbiyoSupportedCountryCodes,
} from "@/lib/mbiyo/supported-countries";

const E164 = z.string().regex(/^\+\d{10,15}$/, "Use international format with + (E.164), e.g. +221771234567");

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
    countryCode: z.string().length(2).transform((s) => s.toUpperCase()),
    network: z.string().min(2).max(32).transform((s) => s.toLowerCase()),
    currency: z.string().length(3).optional().transform((s) => (s ? s.toUpperCase() : "UGX")),
    omOtp: z.string().max(32).optional(),
  })
  .superRefine((val, ctx) => {
    if (!val.studentId?.trim()) {
      if (!val.name?.trim()) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "name is required when studentId is omitted", path: ["name"] });
      }
    }
    const country = findMbiyoCountry(val.countryCode);
    if (!country) return;
    if (!country.networks.some((n) => n.value === val.network)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Invalid network "${val.network}" for ${country.code}`,
        path: ["network"],
      });
    }
  });

/**
 * Guest or logged-in student: create pending **mbiyo** payment and initiate OpenPayGlobal payin (MbiyoPay infrastructure).
 * Webhook: `POST /api/webhooks/mbiyo` (set `NEXT_PUBLIC_APP_URL` for callback_url).
 */
export async function POST(req: Request) {
  try {
    if (!isMbiyoConfigured()) {
      return NextResponse.json({ error: mbiyoNotConfiguredMessage(), code: "mbiyo_not_configured" }, { status: 503 });
    }

    const ip = clientIp(req);
    if (rateLimitHit(`checkout-mbiyo:${ip}`, 25, 60 * 60 * 1000)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const json = await req.json().catch(() => null);
    const parsed = Body.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid body", details: parsed.error.flatten() }, { status: 400 });
    }

    const d = parsed.data;

    if (!isMbiyoCountrySupported(d.countryCode)) {
      return NextResponse.json(
        {
          error: `Country ${d.countryCode} is not supported for OpenPayGlobal mobile money. Choose: ${mbiyoSupportedCountryCodes().join(", ")}. Uganda (UG) is not on the provider network — use TON or a supported country.`,
          code: "mbiyo_country_unsupported",
        },
        { status: 400 },
      );
    }

    const country = findMbiyoCountry(d.countryCode)!;
    const settleCurrency = mbiyoCurrencyForCountry(d.countryCode);

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
      await prisma.student.update({
        where: { id: studentId },
        data: { phone: d.phone },
      });
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
      rail: PaymentRail.mbiyo,
      feeSelectionMode: d.feeSelectionMode,
      feeIds: d.feeIds,
      installmentCount: d.installmentCount,
      installmentIndex: guard.installmentIndex ?? d.installmentIndex ?? 1,
      installmentPlanId: guard.installmentPlanId ?? d.installmentPlanId,
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");
    const callbackUrl = appUrl ? `${appUrl}/api/webhooks/mbiyo` : undefined;

    let collectAmount: number;
    try {
      collectAmount = await convertUgxToCurrency(doc.totalUgx, settleCurrency);
    } catch (e) {
      await prisma.payment.deleteMany({ where: { id: doc.id, status: "pending" } }).catch(() => {});
      const msg = e instanceof Error ? e.message : "Could not convert UGX total for mobile money";
      return NextResponse.json({ error: msg }, { status: 502 });
    }

    let payin;
    try {
      payin = await mbiyoMerchantPayin({
        amount: collectAmount,
        currency: settleCurrency,
        order_id: doc.id,
        callback_url: callbackUrl,
        metadata: {
          network: d.network,
          phone_number: d.phone,
          country_code: country.code,
          ...(d.omOtp ? { om_otp: d.omOtp } : {}),
        },
      });
    } catch (e) {
      await prisma.payment.deleteMany({ where: { id: doc.id, status: "pending" } }).catch(() => {});
      const msg = e instanceof Error ? e.message : String(e);
      const status = msg.includes("not configured") ? 503 : 502;
      return NextResponse.json({ error: msg, code: status === 503 ? "mbiyo_not_configured" : "mbiyo_payin_failed" }, { status });
    }

    const data = payin.data;
    const txId = data?.transaction_id ?? "";

    await prisma.payment.update({
      where: { id: doc.id },
      data: { momoReference: txId || doc.id },
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
          tuitionUgx: payment.tuitionUgx,
          functionalFeesUgx: payment.functionalFeesUgx,
          totalUgx: payment.totalUgx,
          platformFeeUgx: payment.platformFeeUgx,
          feeSelectionMode: payment.feeSelectionMode,
          includedFeeIds: payment.includedFeeIds,
          ugxPerTonSnapshot: payment.ugxPerTonSnapshot,
          tonAmount: payment.tonAmount,
          destinationWallet: payment.destinationWallet,
          rail: payment.rail,
          status: payment.status,
          memo: payment.memo,
          momoReference: payment.momoReference,
          createdAt: payment.createdAt,
        },
        mbiyo: {
          transactionId: data?.transaction_id ?? null,
          status: data?.status ?? null,
          redirectUrl: data?.redirect_url ?? null,
          instructions: data?.instructions ?? null,
          authMode: data?.auth_mode ?? null,
          chargedAmount: data?.charged_amount ?? null,
          fee: data?.fee ?? null,
          currency: data?.currency ?? settleCurrency,
          collectAmount,
          quotedUgx: doc.totalUgx,
        },
      },
      { status: 201 },
    );
    if (checkoutToken) attachCheckoutSessionCookie(res, checkoutToken);
    return res;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not start OpenPayGlobal payment";
    let status = 500;
    if (msg.includes("not active") || msg.includes("not found")) status = 404;
    if (
      msg.includes("Programme not found") ||
      msg.includes("No fee schedule") ||
      msg.includes("Invalid") ||
      msg.includes("Installment plan not found")
    )
      status = 400;
    if (status === 500) console.error("[checkout/mbiyo-start]", e);
    return NextResponse.json({ error: msg }, { status });
  }
}
