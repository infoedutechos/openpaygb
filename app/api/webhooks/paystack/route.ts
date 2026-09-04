import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { deploymentEnv, warmDeploymentEnvCache } from "@/lib/deployment-env-resolve";
import { confirmCardAcquiringPayment } from "@/lib/card-acquiring-confirm";
import { clientIp, rateLimitHit } from "@/lib/rate-limit";
import { apiErrorResponse } from "@/lib/api-error";

function paystackSignatureOk(rawBody: string, header: string | null, secret: string): boolean {
  if (!header || !secret) return false;
  const expected = createHmac("sha512", secret).update(rawBody).digest("hex");
  try {
    const a = Buffer.from(expected);
    const b = Buffer.from(header.trim());
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/** Paystack charge.success webhook → confirm PaymentRail.card. */
export async function POST(req: Request) {
  try {
    await warmDeploymentEnvCache();
    if (rateLimitHit(`ps-hook:${clientIp(req)}`, 120, 60_000)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const rawBody = await req.text();
    const secret = deploymentEnv("PAYSTACK_SECRET_KEY");
    const sig = req.headers.get("x-paystack-signature");
    if (secret && !paystackSignatureOk(rawBody, sig, secret) && process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = JSON.parse(rawBody || "{}") as {
      event?: string;
      data?: {
        status?: string;
        reference?: string;
        amount?: number;
        currency?: string;
        id?: number | string;
      };
    };

    const success =
      body.event === "charge.success" ||
      (body.data?.status || "").toLowerCase() === "success";
    const amountMajor =
      typeof body.data?.amount === "number" ? body.data.amount / 100 : undefined;

    const result = await confirmCardAcquiringPayment({
      providerReference: body.data?.reference || "",
      amount: amountMajor,
      currency: body.data?.currency,
      success,
      providerTxId: body.data?.id != null ? String(body.data.id) : undefined,
    });

    return NextResponse.json({ ok: true, ...result, event: body.event ?? null });
  } catch (e) {
    return apiErrorResponse(e, { route: "POST /api/webhooks/paystack" });
  }
}

export function GET() {
  return new NextResponse("OK", { status: 200 });
}
