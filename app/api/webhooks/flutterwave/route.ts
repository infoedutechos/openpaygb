import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { deploymentEnv, warmDeploymentEnvCache } from "@/lib/deployment-env-resolve";
import { confirmCardAcquiringPayment } from "@/lib/card-acquiring-confirm";
import { clientIp, rateLimitHit } from "@/lib/rate-limit";
import { apiErrorResponse } from "@/lib/api-error";

function secretOk(rawBody: string, header: string | null, secret: string): boolean {
  if (!header || !secret) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(header.replace(/^sha256=/i, "").trim());
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** Flutterwave charge.completed webhook → confirm PaymentRail.card. */
export async function POST(req: Request) {
  try {
    await warmDeploymentEnvCache();
    if (rateLimitHit(`fw-hook:${clientIp(req)}`, 120, 60_000)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const rawBody = await req.text();
    const secret = deploymentEnv("FLUTTERWAVE_WEBHOOK_SECRET") || deploymentEnv("FLUTTERWAVE_SECRET_KEY");
    const sig = req.headers.get("verif-hash") || req.headers.get("x-flutterwave-signature");
    // Flutterwave dashboard often uses verif-hash = secret string equality
    const verifHash = req.headers.get("verif-hash");
    const hashOk =
      (verifHash && secret && verifHash === secret) ||
      secretOk(rawBody, sig, secret);
    if (secret && !hashOk && process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = JSON.parse(rawBody || "{}") as {
      event?: string;
      data?: {
        status?: string;
        tx_ref?: string;
        amount?: number;
        currency?: string;
        id?: number | string;
      };
    };

    const status = (body.data?.status || "").toLowerCase();
    const success = status === "successful" || status === "success";
    const result = await confirmCardAcquiringPayment({
      providerReference: body.data?.tx_ref || "",
      amount: body.data?.amount,
      currency: body.data?.currency,
      success,
      providerTxId: body.data?.id != null ? String(body.data.id) : undefined,
    });

    return NextResponse.json({ ok: true, ...result, event: body.event ?? null });
  } catch (e) {
    return apiErrorResponse(e, { route: "POST /api/webhooks/flutterwave" });
  }
}

export function GET() {
  return new NextResponse("OK", { status: 200 });
}
