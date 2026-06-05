import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { handleFirstTimeConfirmation } from "@/lib/on-payment-confirmed";
import { clientIp, rateLimitHit } from "@/lib/rate-limit";
import { mbiyoWebhookSignatureOk } from "@/lib/mbiyo/verify-webhook-signature";
import { requireConfiguredSecret, isProductionRuntime } from "@/lib/production-secrets";
import { webhookAmountMatchesPayment } from "@/lib/webhook-payment-confirm";
import { mbiyoGetTransaction } from "@/lib/mbiyo/client";

const Payload = z.object({
  transaction_id: z.string().min(1),
  order_id: z.string().min(1).optional(),
  status: z.string(),
  amount: z.number().optional(),
  currency: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

/** MBIYOPAY may probe the URL; respond OK. */
export function GET() {
  return new NextResponse("OK", { status: 200 });
}

/**
 * MBIYOPAY payin status callback. Matches `order_id` (payment id) and confirms on `successful`.
 * Re-fetches the transaction when `MBIYO_SECRET_KEY` is set (recommended).
 * Duplicate deliveries are safe: `updateMany` only transitions from `pending`.
 */
export async function POST(req: Request) {
  const secretCheck = requireConfiguredSecret("MBIYO_WEBHOOK_SECRET", process.env.MBIYO_WEBHOOK_SECRET);
  if (!secretCheck.ok) return secretCheck.response;

  if (rateLimitHit(`mbiyo-hook:${clientIp(req)}`, 120, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const rawBody = await req.text();
  if (!mbiyoWebhookSignatureOk(rawBody, req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody) as unknown;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = Payload.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: true, action: "ignored_shape" });
  }

  const { transaction_id, order_id, status } = parsed.data;
  const paymentId = order_id?.trim() || "";

  if (status !== "successful") {
    return NextResponse.json({ ok: true, action: "not_success", status });
  }

  if (!paymentId) {
    return NextResponse.json({ ok: true, action: "no_order_id" });
  }

  if (isProductionRuntime() && !process.env.MBIYO_SECRET_KEY?.trim()) {
    return NextResponse.json({ ok: false, error: "MBIYO_SECRET_KEY required in production" }, { status: 503 });
  }

  if (process.env.MBIYO_SECRET_KEY?.trim()) {
    try {
      const remote = await mbiyoGetTransaction(transaction_id);
      const st = remote.data?.status;
      if (st !== "successful") {
        return NextResponse.json({ ok: true, action: "remote_not_success", remoteStatus: st });
      }
      const remoteOrder = remote.data?.order_id?.trim();
      if (remoteOrder && remoteOrder !== paymentId) {
        return NextResponse.json({ ok: true, action: "order_mismatch" });
      }
    } catch {
      return NextResponse.json({ ok: false, error: "verification_failed" }, { status: 502 });
    }
  }

  const payment = await prisma.payment.findFirst({
    where: { id: paymentId },
  });
  if (!payment) {
    return NextResponse.json({ ok: true, action: "unknown_payment", paymentId });
  }

  if (payment.status === "confirmed") {
    return NextResponse.json({ ok: true, action: "already_confirmed", paymentId: payment.id });
  }

  if (!webhookAmountMatchesPayment(payment.totalUgx, parsed.data.amount, parsed.data.currency)) {
    return NextResponse.json({ ok: true, action: "amount_mismatch", paymentId: payment.id });
  }

  const n = await prisma.payment.updateMany({
    where: { id: payment.id, status: "pending" },
    data: {
      status: "confirmed",
      confirmedAt: new Date(),
      momoReference: transaction_id,
    },
  });

  if (n.count === 0) {
    return NextResponse.json({ ok: true, action: "already_confirmed", paymentId: payment.id });
  }

  const updated = await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } });
  handleFirstTimeConfirmation(updated);

  return NextResponse.json({ ok: true, action: "confirmed", paymentId: payment.id });
}
