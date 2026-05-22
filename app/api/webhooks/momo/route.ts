import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { handleFirstTimeConfirmation } from "@/lib/on-payment-confirmed";
import { findPaymentByMomoReference } from "@/lib/momo/find-payment";
import { extractMomoReference, isMomoSuccessStatus } from "@/lib/momo/parse";
import { clientIp, rateLimitHit } from "@/lib/rate-limit";
import { requireConfiguredSecret } from "@/lib/production-secrets";

const HeadersSchema = z.object({
  "x-momo-webhook-secret": z.string().optional(),
});

function authorized(req: Request): { ok: true } | { ok: false; response: NextResponse } {
  const secretCheck = requireConfiguredSecret("MOMO_WEBHOOK_SECRET", process.env.MOMO_WEBHOOK_SECRET);
  if (!secretCheck.ok) return secretCheck;

  const secret = process.env.MOMO_WEBHOOK_SECRET?.trim();
  if (!secret) return { ok: true };

  const headers = HeadersSchema.safeParse({
    "x-momo-webhook-secret": req.headers.get("x-momo-webhook-secret") ?? undefined,
  });
  if (headers.success && headers.data["x-momo-webhook-secret"] === secret) {
    return { ok: true };
  }
  return { ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
}

/** Some providers call GET during URL registration. */
export function GET() {
  return new NextResponse("OK", { status: 200 });
}

/**
 * Mobile money collect callbacks (MTN/Airtel-style payloads).
 * On success, matches `paymentId` or `momoReference`, confirms the payment, notifies Telegram,
 * and queues the UGX→TON bridge hook for `momo_bridge` rails.
 */
export async function POST(req: Request) {
  const auth = authorized(req);
  if (!auth.ok) return auth.response;
  if (rateLimitHit(`momo-hook:${clientIp(req)}`, 120, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const body: unknown = await req.json().catch(() => null);
  if (body === null || typeof body !== "object") {
    return NextResponse.json({ ok: false, error: "Expected JSON body" }, { status: 400 });
  }

  const ref = extractMomoReference(body);
  if (!ref) {
    return NextResponse.json({ ok: true, action: "no_reference" });
  }

  const payment = await findPaymentByMomoReference(ref);
  if (!payment) {
    return NextResponse.json({ ok: true, action: "unknown_reference", reference: ref });
  }

  if (!isMomoSuccessStatus(body)) {
    return NextResponse.json({
      ok: true,
      action: "not_success",
      paymentId: payment.id,
    });
  }

  if (payment.status === "confirmed") {
    return NextResponse.json({ ok: true, action: "already_confirmed", paymentId: payment.id });
  }

  const momoRef = payment.momoReference?.trim() ? payment.momoReference : ref;

  const n = await prisma.payment.updateMany({
    where: { id: payment.id, status: "pending" },
    data: {
      status: "confirmed",
      confirmedAt: new Date(),
      momoReference: momoRef,
    },
  });

  if (n.count === 0) {
    return NextResponse.json({
      ok: true,
      action: "already_confirmed",
      paymentId: payment.id,
    });
  }

  const updated = await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } });
  handleFirstTimeConfirmation(updated);

  return NextResponse.json({
    ok: true,
    action: "confirmed",
    paymentId: payment.id,
  });
}
