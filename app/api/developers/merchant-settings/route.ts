import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse } from "@/lib/api-error";
import { requireDeveloperSession } from "@/lib/developer-auth";
import { developerAppPublicView } from "@/lib/developer-app";
import { getMerchantSettlementSummary } from "@/lib/merchant-charge";
import { quoteMerchantChargeFees } from "@/lib/merchant-charge-fees";
import { activateWhiteLabelIfNeeded, getWhiteLabelPricing } from "@/lib/white-label-fees";

const PatchBody = z.object({
  brandingName: z.string().max(120).optional(),
  brandingLogoUrl: z.string().max(500).optional(),
  brandingPrimaryColor: z.string().max(20).optional(),
  brandingAccentColor: z.string().max(20).optional(),
  whiteLabelMode: z.boolean().optional(),
  supportEmail: z.union([z.literal(""), z.string().email()]).optional(),
  supportUrl: z.union([z.literal(""), z.string().url()]).optional(),
  platformFeePayer: z.enum(["pass_through", "absorb"]).optional(),
  merchantSurchargePercent: z.number().min(0).max(50).optional(),
  merchantSurchargeFixedUgx: z.number().int().min(0).max(5_000_000).optional(),
  platformFeeOverrideKind: z.enum(["inherit", "fixed_ugx", "percent", "none"]).optional(),
  platformFeeOverrideUgx: z.number().int().min(-1).max(5_000_000).optional(),
  platformFeeOverridePercent: z.number().min(0).max(50).optional(),
  payoutPhone: z.string().max(32).optional(),
  payoutNetwork: z.enum(["MTN", "AIRTEL", ""]).optional(),
  sampleOrderUgx: z.number().int().positive().optional(),
});

export async function GET() {
  try {
    const gate = await requireDeveloperSession();
    if (!gate.ok) return gate.response;

    const [summary, sample, whiteLabelPricing] = await Promise.all([
      getMerchantSettlementSummary(gate.app.id),
      quoteMerchantChargeFees({
        developerAppId: gate.app.id,
        orderAmountUgx: 25_000,
      }),
      getWhiteLabelPricing(),
    ]);

    return NextResponse.json({
      app: gate.app,
      settlement: summary,
      sampleFeeQuote: sample,
      whiteLabelPricing,
    });
  } catch (e) {
    return apiErrorResponse(e, { route: "GET /api/developers/merchant-settings" });
  }
}

export async function PATCH(req: Request) {
  try {
    const gate = await requireDeveloperSession();
    if (!gate.ok) return gate.response;

    const parsed = PatchBody.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid body", details: parsed.error.flatten() }, { status: 400 });
    }

    const d = parsed.data;
    let activation: { activated: boolean; activationFeeUgx: number; alreadyActive: boolean } | null =
      null;

    if (d.whiteLabelMode === true) {
      activation = await activateWhiteLabelIfNeeded(gate.app.id);
    }

    const updated = await prisma.developerApp.update({
      where: { id: gate.app.id },
      data: {
        ...(d.brandingName !== undefined ? { brandingName: d.brandingName.trim() } : {}),
        ...(d.brandingLogoUrl !== undefined ? { brandingLogoUrl: d.brandingLogoUrl.trim() } : {}),
        ...(d.brandingPrimaryColor !== undefined
          ? { brandingPrimaryColor: d.brandingPrimaryColor.trim() }
          : {}),
        ...(d.brandingAccentColor !== undefined
          ? { brandingAccentColor: d.brandingAccentColor.trim() }
          : {}),
        ...(d.whiteLabelMode === false ? { whiteLabelMode: false } : {}),
        // true path handled by activateWhiteLabelIfNeeded above
        ...(d.supportEmail !== undefined ? { supportEmail: d.supportEmail.trim() } : {}),
        ...(d.supportUrl !== undefined ? { supportUrl: d.supportUrl.trim() } : {}),
        ...(d.platformFeePayer !== undefined ? { platformFeePayer: d.platformFeePayer } : {}),
        ...(d.merchantSurchargePercent !== undefined
          ? { merchantSurchargePercent: d.merchantSurchargePercent }
          : {}),
        ...(d.merchantSurchargeFixedUgx !== undefined
          ? { merchantSurchargeFixedUgx: d.merchantSurchargeFixedUgx }
          : {}),
        ...(d.platformFeeOverrideKind !== undefined
          ? { platformFeeOverrideKind: d.platformFeeOverrideKind }
          : {}),
        ...(d.platformFeeOverrideUgx !== undefined
          ? { platformFeeOverrideUgx: d.platformFeeOverrideUgx }
          : {}),
        ...(d.platformFeeOverridePercent !== undefined
          ? { platformFeeOverridePercent: d.platformFeeOverridePercent }
          : {}),
        ...(d.payoutPhone !== undefined ? { payoutPhone: d.payoutPhone.trim() } : {}),
        ...(d.payoutNetwork !== undefined ? { payoutNetwork: d.payoutNetwork } : {}),
      },
    });

    const sampleOrder = d.sampleOrderUgx ?? 25_000;
    const [sample, summary, whiteLabelPricing] = await Promise.all([
      quoteMerchantChargeFees({
        developerAppId: updated.id,
        orderAmountUgx: sampleOrder,
      }),
      getMerchantSettlementSummary(updated.id),
      getWhiteLabelPricing(),
    ]);

    return NextResponse.json({
      app: developerAppPublicView(updated),
      settlement: summary,
      sampleFeeQuote: sample,
      whiteLabelPricing,
      whiteLabelActivation: activation,
    });
  } catch (e) {
    return apiErrorResponse(e, { route: "PATCH /api/developers/merchant-settings" });
  }
}
