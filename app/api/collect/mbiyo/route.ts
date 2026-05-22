import { NextResponse } from "next/server";
import { z } from "zod";
import { PaymentRail } from "@prisma/client";
import { assertActiveOrganizationSlug } from "@/lib/organizations";
import { upsertCheckoutStudent } from "@/lib/checkout-student";
import { prisma } from "@/lib/prisma";
import { createPendingPayment } from "@/lib/create-payment";
import { assertCanStartCheckoutPayment } from "@/lib/tuition-balance";
import { clientIp, rateLimitHit } from "@/lib/rate-limit";
import {
  isMbiyoConfigured,
  mbiyoMerchantPayin,
  mbiyoNotConfiguredMessage,
} from "@/lib/mbiyo/client";
import { convertUgxToCurrency } from "@/lib/mbiyo/convert-ugx";
import { findMbiyoCountry, mbiyoCurrencyForCountry } from "@/lib/mbiyo/supported-countries";

const Body = z
  .object({
    organizationSlug: z.string().min(2).optional(),
    name: z.string().min(2),
    email: z.string().email().optional().or(z.literal("")),
    phone: z.string().regex(/^\+\d{10,15}$/, "Use E.164 with + and country code, e.g. +221771234567"),
    programmeCode: z.string().min(2),
    year: z.number().int().min(1).max(6),
    semester: z.number().int().min(1).max(3),
    countryCode: z.string().length(2).transform((s) => s.toUpperCase()),
    /** MbiyoPay network id, e.g. mtn, orange, vodafone */
    network: z.string().min(2).max(32).transform((s) => s.toLowerCase()),
    currency: z.string().length(3).optional().transform((s) => (s ? s.toUpperCase() : undefined)),
    omOtp: z.string().max(32).optional(),
  })
  .superRefine((val, ctx) => {
    const country = findMbiyoCountry(val.countryCode);
    if (!country) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Country ${val.countryCode} is not supported by OpenPayGlobal / MbiyoPay`,
        path: ["countryCode"],
      });
      return;
    }
    if (!country.networks.some((n) => n.value === val.network)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Invalid network "${val.network}" for ${country.code}`,
        path: ["network"],
      });
    }
  });

/**
 * Legacy collect: creates student + pending payment, initiates MbiyoPay payin for default org.
 * Prefer guest/student `/api/public/checkout/mbiyo-start` for tuition hub.
 */
export async function POST(req: Request) {
  if (!isMbiyoConfigured()) {
    return NextResponse.json(
      { error: mbiyoNotConfiguredMessage(), code: "mbiyo_not_configured" },
      { status: 503 },
    );
  }

  if (rateLimitHit(`collect-mbiyo:${clientIp(req)}`, 30, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const raw = await req.json().catch(() => null);
  const parsed = Body.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body", details: parsed.error.flatten() }, { status: 400 });
  }

  const d = parsed.data;
  const slug = (d.organizationSlug ?? "default").trim().toLowerCase();

  try {
    const org = await assertActiveOrganizationSlug(slug);
    const country = findMbiyoCountry(d.countryCode)!;
    const settleCurrency = d.currency?.trim() || mbiyoCurrencyForCountry(d.countryCode);

    const { student } = await upsertCheckoutStudent({
      organizationId: org.id,
      name: d.name,
      email: d.email,
      phone: d.phone,
      programmeCode: d.programmeCode,
      year: d.year,
      semester: d.semester,
    });

    const guard = await assertCanStartCheckoutPayment({
      studentId: student.id,
      programmeCode: d.programmeCode,
      year: d.year,
      semester: d.semester,
      feeSelectionMode: "semester",
    });
    if (!guard.ok) {
      return NextResponse.json({ error: guard.error }, { status: 409 });
    }

    const paymentResult = await createPendingPayment({
      studentId: student.id,
      programmeCode: d.programmeCode,
      year: d.year,
      semester: d.semester,
      rail: PaymentRail.mbiyo,
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");
    const callbackUrl = appUrl ? `${appUrl}/api/webhooks/mbiyo` : undefined;

    let collectAmount: number;
    try {
      collectAmount = await convertUgxToCurrency(paymentResult.totalUgx, settleCurrency);
    } catch (e) {
      await prisma.payment.deleteMany({ where: { id: paymentResult.id, status: "pending" } }).catch(() => {});
      const msg = e instanceof Error ? e.message : "Could not convert UGX total for mobile money";
      return NextResponse.json({ error: msg }, { status: 502 });
    }

    let payin;
    try {
      payin = await mbiyoMerchantPayin({
        amount: collectAmount,
        currency: settleCurrency,
        order_id: paymentResult.id,
        callback_url: callbackUrl,
        metadata: {
          network: d.network,
          phone_number: d.phone,
          country_code: country.code,
          ...(d.omOtp ? { om_otp: d.omOtp } : {}),
        },
      });
    } catch (e) {
      await prisma.payment.deleteMany({ where: { id: paymentResult.id, status: "pending" } }).catch(() => {});
      const msg = e instanceof Error ? e.message : String(e);
      const status = msg.includes("not configured") ? 503 : 502;
      return NextResponse.json(
        { error: msg, code: status === 503 ? "mbiyo_not_configured" : "mbiyo_payin_failed" },
        { status },
      );
    }

    const data = payin.data;
    const txId = data?.transaction_id ?? "";

    await prisma.payment.update({
      where: { id: paymentResult.id },
      data: { momoReference: txId || paymentResult.id },
    });

    const payment = await prisma.payment.findUniqueOrThrow({
      where: { id: paymentResult.id },
    });

    return NextResponse.json(
      {
        payment: {
          id: payment.id,
          studentId: student.id,
          totalUgx: payment.totalUgx,
          tonAmount: payment.tonAmount,
          momoReference: payment.momoReference || payment.id,
          status: payment.status,
          rail: payment.rail,
          memo: payment.memo,
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
          quotedUgx: payment.totalUgx,
        },
      },
      { status: 201 },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not start OpenPayGlobal payment";
    const status =
      msg.includes("not active") || msg.includes("not found") ? 404 : msg.includes("Invalid") ? 400 : 500;
    if (status === 500) console.error("[collect/mbiyo]", e);
    return NextResponse.json({ error: msg }, { status });
  }
}
