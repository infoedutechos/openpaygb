import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireMaster } from "@/lib/master-session";
import {
  getCheckoutPlatformFeeUgxFromEnv,
  getInheritedCheckoutPlatformFeeUgx,
} from "@/lib/checkout-platform-fee";

const PatchBody = z.object({
  checkoutPlatformFeeDefaultUgx: z.number().int().min(-1).max(1_000_000_000),
});

export async function GET() {
  const gate = await requireMaster();
  if (!gate.ok) return gate.response;

  const row = await prisma.siteUiSettings.findUnique({
    where: { key: "platform" },
    select: { checkoutPlatformFeeDefaultUgx: true },
  });
  const checkoutPlatformFeeDefaultUgx = row?.checkoutPlatformFeeDefaultUgx ?? -1;
  const envFallbackUgx = getCheckoutPlatformFeeUgxFromEnv();
  const effectiveDefaultUgx = await getInheritedCheckoutPlatformFeeUgx();

  return NextResponse.json({
    checkoutPlatformFeeDefaultUgx,
    envFallbackUgx,
    effectiveDefaultUgx,
  });
}

export async function PATCH(req: Request) {
  const gate = await requireMaster();
  if (!gate.ok) return gate.response;

  const json = await req.json().catch(() => null);
  const parsed = PatchBody.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body", details: parsed.error.flatten() }, { status: 400 });
  }

  const n = parsed.data.checkoutPlatformFeeDefaultUgx;

  const updated = await prisma.siteUiSettings.upsert({
    where: { key: "platform" },
    create: {
      key: "platform",
      checkoutPlatformFeeDefaultUgx: n,
    },
    update: { checkoutPlatformFeeDefaultUgx: n },
    select: { checkoutPlatformFeeDefaultUgx: true },
  });

  const envFallbackUgx = getCheckoutPlatformFeeUgxFromEnv();
  const effectiveDefaultUgx = await getInheritedCheckoutPlatformFeeUgx();

  return NextResponse.json({
    checkoutPlatformFeeDefaultUgx: updated.checkoutPlatformFeeDefaultUgx,
    envFallbackUgx,
    effectiveDefaultUgx,
  });
}
