import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse } from "@/lib/api-error";
import { requireMaster } from "@/lib/master-session";
import { getWhiteLabelPricing } from "@/lib/white-label-fees";
import { quoteMerchantChargeFees } from "@/lib/merchant-charge-fees";

async function ensureSiteRow() {
  return prisma.siteUiSettings.upsert({
    where: { key: "platform" },
    create: { key: "platform" },
    update: {},
  });
}

export async function GET() {
  try {
    const gate = await requireMaster();
    if (!gate.ok) return gate.response;

    const pricing = await getWhiteLabelPricing();
    return NextResponse.json({
      ...pricing,
      sampleOn25000: {
        note: "Illustrative base fee only (no white-label) using platform defaults",
        orderAmountUgx: 25_000,
        estimatedBaseFeeUgx:
          pricing.merchantChargePlatformFeeKind === "fixed_ugx"
            ? pricing.merchantChargePlatformFeeUgx
            : pricing.merchantChargePlatformFeeKind === "percent"
              ? Math.max(
                  pricing.merchantChargePlatformFeeMinUgx,
                  Math.round((25_000 * pricing.merchantChargePlatformFeePercent) / 100),
                )
              : 0,
        estimatedWhiteLabelExtraUgx:
          pricing.whiteLabelFeeKind === "fixed_ugx"
            ? pricing.whiteLabelFeeUgx
            : pricing.whiteLabelFeeKind === "percent"
              ? Math.round((25_000 * pricing.whiteLabelFeePercent) / 100)
              : 0,
      },
    });
  } catch (e) {
    return apiErrorResponse(e, { route: "GET /api/master/opgb-merchant-fees" });
  }
}

const PatchBody = z.object({
  merchantChargePlatformFeeKind: z.enum(["fixed_ugx", "percent", "none"]).optional(),
  merchantChargePlatformFeeUgx: z.number().int().min(0).max(5_000_000).optional(),
  merchantChargePlatformFeePercent: z.number().min(0).max(50).optional(),
  merchantChargePlatformFeeMinUgx: z.number().int().min(0).max(5_000_000).optional(),
  whiteLabelFeeKind: z.enum(["none", "fixed_ugx", "percent"]).optional(),
  whiteLabelFeeUgx: z.number().int().min(0).max(5_000_000).optional(),
  whiteLabelFeePercent: z.number().min(0).max(50).optional(),
  whiteLabelActivationFeeUgx: z.number().int().min(0).max(50_000_000).optional(),
});

export async function PATCH(req: Request) {
  try {
    const gate = await requireMaster();
    if (!gate.ok) return gate.response;

    const parsed = PatchBody.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid body", details: parsed.error.flatten() }, { status: 400 });
    }

    await ensureSiteRow();
    const d = parsed.data;
    await prisma.siteUiSettings.update({
      where: { key: "platform" },
      data: {
        ...(d.merchantChargePlatformFeeKind !== undefined
          ? { merchantChargePlatformFeeKind: d.merchantChargePlatformFeeKind }
          : {}),
        ...(d.merchantChargePlatformFeeUgx !== undefined
          ? { merchantChargePlatformFeeUgx: d.merchantChargePlatformFeeUgx }
          : {}),
        ...(d.merchantChargePlatformFeePercent !== undefined
          ? { merchantChargePlatformFeePercent: d.merchantChargePlatformFeePercent }
          : {}),
        ...(d.merchantChargePlatformFeeMinUgx !== undefined
          ? { merchantChargePlatformFeeMinUgx: d.merchantChargePlatformFeeMinUgx }
          : {}),
        ...(d.whiteLabelFeeKind !== undefined ? { whiteLabelFeeKind: d.whiteLabelFeeKind } : {}),
        ...(d.whiteLabelFeeUgx !== undefined ? { whiteLabelFeeUgx: d.whiteLabelFeeUgx } : {}),
        ...(d.whiteLabelFeePercent !== undefined
          ? { whiteLabelFeePercent: d.whiteLabelFeePercent }
          : {}),
        ...(d.whiteLabelActivationFeeUgx !== undefined
          ? { whiteLabelActivationFeeUgx: d.whiteLabelActivationFeeUgx }
          : {}),
      },
    });

    const pricing = await getWhiteLabelPricing();
    return NextResponse.json(pricing);
  } catch (e) {
    return apiErrorResponse(e, { route: "PATCH /api/master/opgb-merchant-fees" });
  }
}

/** Optional helper for master preview against a real app id. */
export async function POST(req: Request) {
  try {
    const gate = await requireMaster();
    if (!gate.ok) return gate.response;
    const body = z
      .object({
        developerAppId: z.string().min(1),
        orderAmountUgx: z.number().int().positive().default(25_000),
      })
      .safeParse(await req.json().catch(() => null));
    if (!body.success) {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }
    const quote = await quoteMerchantChargeFees(body.data);
    return NextResponse.json({ quote });
  } catch (e) {
    return apiErrorResponse(e, { route: "POST /api/master/opgb-merchant-fees" });
  }
}
