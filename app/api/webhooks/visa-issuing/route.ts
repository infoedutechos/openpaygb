import { NextResponse } from "next/server";
import { deploymentEnv, warmDeploymentEnvCache } from "@/lib/deployment-env-resolve";
import { prisma } from "@/lib/prisma";
import { withPrismaRetry } from "@/lib/prisma-retry";
import { clientIp, rateLimitHit } from "@/lib/rate-limit";
import { apiErrorResponse } from "@/lib/api-error";

/** Partner / Visa lifecycle webhooks — updates NetworkIssuedCard status only. */
export async function POST(req: Request) {
  try {
    await warmDeploymentEnvCache();
    if (rateLimitHit(`visa-issuing-hook:${clientIp(req)}`, 120, 60_000)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const secret = deploymentEnv("VISA_WEBHOOK_SECRET");
    const hdr = req.headers.get("x-visa-webhook-secret") || req.headers.get("x-webhook-secret");
    if (secret && hdr !== secret && process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json().catch(() => ({}))) as {
      providerCardId?: string;
      cardId?: string;
      status?: string;
      last4?: string;
      reference?: string;
    };

    const providerCardId = (body.providerCardId || body.cardId || "").trim();
    const status = (body.status || "").toLowerCase();
    if (!providerCardId && !body.reference) {
      return NextResponse.json({ action: "ignored", reason: "no_id" });
    }

    const row = await withPrismaRetry(() =>
      prisma.networkIssuedCard.findFirst({
        where: providerCardId
          ? { providerCardId }
          : { clientReference: body.reference || "" },
      }),
    );

    if (!row) return NextResponse.json({ action: "unknown_card" });

    const nextStatus =
      status.includes("active") || status === "issued"
        ? "active"
        : status.includes("fail")
          ? "failed"
          : status.includes("freeze") || status === "frozen"
            ? "frozen"
            : status.includes("close")
              ? "closed"
              : row.status;

    await withPrismaRetry(() =>
      prisma.networkIssuedCard.update({
        where: { id: row.id },
        data: {
          status: nextStatus,
          ...(body.last4 ? { last4: String(body.last4).replace(/\D/g, "").slice(-4) } : {}),
        },
      }),
    );

    return NextResponse.json({ ok: true, action: "updated", id: row.id, status: nextStatus });
  } catch (e) {
    return apiErrorResponse(e, { route: "POST /api/webhooks/visa-issuing" });
  }
}

export function GET() {
  return new NextResponse("OK", { status: 200 });
}
