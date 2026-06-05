import { NextResponse } from "next/server";
import { z } from "zod";
import { PaymentRail, PaymentStatus } from "@prisma/client";
import { createTonPayTransfer, TON } from "@ton-pay/api";
import { prisma } from "@/lib/prisma";
import { getServerTonPayOptions } from "@/lib/ton-pay-options";
import { assertCheckoutStudentAccess } from "@/lib/checkout-session";
import { clientIp, rateLimitHit } from "@/lib/rate-limit";
import { apiErrorResponse } from "@/lib/api-error";

const Body = z.object({
  paymentId: z.string().min(20).max(30),
  senderAddr: z.string().min(10).max(128),
});

export async function POST(req: Request) {
  try {
    const ip = clientIp(req);
    if (rateLimitHit(`checkout-tonpay:${ip}`, 60, 60 * 60 * 1000)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const json = await req.json().catch(() => null);
    const parsed = Body.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid body", details: parsed.error.flatten() }, { status: 400 });
    }

    const { paymentId, senderAddr } = parsed.data;

    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      select: {
        status: true,
        rail: true,
        tonAmount: true,
        destinationWallet: true,
        memo: true,
        studentId: true,
        organizationId: true,
      },
    });

    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    const access = await assertCheckoutStudentAccess({
      req,
      studentId: payment.studentId,
      organizationId: payment.organizationId,
    });
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }
    if (payment.status !== PaymentStatus.pending) {
      return NextResponse.json({ error: "Payment is not pending" }, { status: 400 });
    }
    if (payment.rail !== PaymentRail.web && payment.rail !== PaymentRail.telegram) {
      return NextResponse.json({ error: "Invalid rail for TON checkout" }, { status: 400 });
    }

    const memo = payment.memo?.trim();
    if (!memo) {
      return NextResponse.json({ error: "Payment has no memo" }, { status: 400 });
    }

    const { message, reference, bodyBase64Hash } = await createTonPayTransfer(
      {
        amount: payment.tonAmount,
        asset: TON,
        recipientAddr: payment.destinationWallet.trim(),
        senderAddr: senderAddr.trim(),
        commentToSender: memo,
      },
      getServerTonPayOptions()
    );

    return NextResponse.json({ message, reference, bodyBase64Hash });
  } catch (e) {
    return apiErrorResponse(e, {
      route: "checkout/ton-pay-transfer",
      fallback: "Could not build transfer",
    });
  }
}
