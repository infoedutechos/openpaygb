import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { clientIp, rateLimitHit } from "@/lib/rate-limit";
import {
  confirmPaymentFromProviderWebhook,
  verifyProviderWebhookAuth,
} from "@/lib/mobile-money-provider-webhook";

type RouteCtx = { params: Promise<{ code: string }> };

export function GET() {
  return new NextResponse("OK", { status: 200 });
}

/**
 * Master-configured mobile-money provider callback.
 * Register `https://<domain>/api/webhooks/provider/<code>` with the PSP.
 */
export async function POST(req: Request, ctx: RouteCtx) {
  const { code } = await ctx.params;
  const slug = code.trim().toLowerCase();

  if (rateLimitHit(`provider-hook:${slug}:${clientIp(req)}`, 120, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const provider = await prisma.mobileMoneyProvider.findUnique({ where: { code: slug } });
  if (!provider || provider.status !== "active") {
    return NextResponse.json({ error: "Unknown or inactive provider" }, { status: 404 });
  }

  const rawBody = await req.text();
  if (!verifyProviderWebhookAuth(provider, req, rawBody)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody) as unknown;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const result = await confirmPaymentFromProviderWebhook({ provider, body });
  return NextResponse.json({ ok: true, provider: slug, ...result });
}
