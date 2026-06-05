import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isValidObjectId } from "@/lib/object-id";
import { createReceiptAccessToken } from "@/lib/receipt-access";
import { paymentPublicPollRateLimited } from "@/lib/payment-public-rate-limit";
import { rateLimitHit } from "@/lib/rate-limit";
import { confirmLivePayPaymentIfEligible } from "@/lib/livepay/confirm-payment";
import {
  isLivePayTransactionSuccessful,
  livePayFetchTransactionStatus,
} from "@/lib/livepay/transaction-status";
import { isLivePayConfigured, livePayCustomerReference } from "@/lib/livepay/client";
import { confirmRelworxPaymentIfEligible } from "@/lib/relworx/confirm-payment";
import {
  isRelworxRequestSuccessful,
  relworxFetchRequestStatusForPayment,
} from "@/lib/relworx/request-status";
import { isRelworxConfigured } from "@/lib/relworx/client";
import { withPrismaRetry } from "@/lib/prisma-retry";

/** Public payment status for UX polling (no auth). Use payment `id` from the checkout response. */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!isValidObjectId(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  if (paymentPublicPollRateLimited(req, id)) {
    return NextResponse.json(
      { error: "Too many requests. Polling will slow down automatically." },
      { status: 429, headers: { "Retry-After": "15" } },
    );
  }

  let p = await withPrismaRetry(() =>
    prisma.payment.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        rail: true,
        totalUgx: true,
        momoReference: true,
        studentId: true,
        txHash: true,
        confirmedAt: true,
        tonAmount: true,
        memo: true,
      },
    }),
  );

  if (!p) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (
    p.status === "pending" &&
    p.rail === "relworx" &&
    isRelworxConfigured() &&
    !rateLimitHit(`relworx-status-sync:${id}`, 8, 60_000)
  ) {
    const remote = await relworxFetchRequestStatusForPayment(p.id, p.momoReference ?? "");
    if (remote && isRelworxRequestSuccessful(remote)) {
      await confirmRelworxPaymentIfEligible(p, {
        status: remote.status,
        request_status: remote.request_status,
        amount: remote.amount,
        currency: remote.currency,
        internal_reference: remote.internal_reference,
        customer_reference: remote.customer_reference ?? p.id,
      });
      p = await withPrismaRetry(() =>
        prisma.payment.findUnique({
          where: { id },
          select: {
            id: true,
            status: true,
            rail: true,
            totalUgx: true,
            momoReference: true,
            studentId: true,
            txHash: true,
            confirmedAt: true,
            tonAmount: true,
            memo: true,
          },
        }),
      );
    }
  }

  if (!p) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (
    p.status === "pending" &&
    p.rail === "livepay" &&
    isLivePayConfigured() &&
    !rateLimitHit(`livepay-status-sync:${id}`, 8, 60_000)
  ) {
    const ref = livePayCustomerReference(p.id);
    const remote = await livePayFetchTransactionStatus(ref);
    if (remote && isLivePayTransactionSuccessful(remote)) {
      await confirmLivePayPaymentIfEligible(p, {
        status: remote.status,
        amount: remote.amount,
        currency: remote.currency,
        internal_reference: remote.internal_reference,
        customer_reference: remote.customer_reference ?? ref,
      });
      p = await withPrismaRetry(() =>
        prisma.payment.findUnique({
          where: { id },
          select: {
            id: true,
            status: true,
            rail: true,
            totalUgx: true,
            momoReference: true,
            studentId: true,
            txHash: true,
            confirmedAt: true,
            tonAmount: true,
            memo: true,
          },
        }),
      );
    }
  }

  if (!p) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const receiptAccessToken =
    p.status === "confirmed"
      ? createReceiptAccessToken({ id, studentId: p.studentId, confirmedAt: p.confirmedAt })
      : null;

  return NextResponse.json({
    payment: {
      id,
      status: p.status,
      txHash: p.txHash,
      confirmedAt: p.confirmedAt,
      tonAmount: p.tonAmount,
      memo: p.memo,
      receiptAccessToken,
    },
  });
}
