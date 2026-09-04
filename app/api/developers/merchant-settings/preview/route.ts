import { NextResponse } from "next/server";
import { z } from "zod";
import { apiErrorResponse } from "@/lib/api-error";
import { requireDeveloperSession } from "@/lib/developer-auth";
import { quoteMerchantChargeFees } from "@/lib/merchant-charge-fees";

const PreviewBody = z.object({
  sampleOrderUgx: z.number().int().positive().max(500_000_000).optional(),
  platformFeePayer: z.enum(["pass_through", "absorb"]).optional(),
  merchantSurchargePercent: z.number().min(0).max(50).optional(),
  merchantSurchargeFixedUgx: z.number().int().min(0).max(5_000_000).optional(),
  platformFeeOverrideKind: z.enum(["inherit", "fixed_ugx", "percent", "none"]).optional(),
  platformFeeOverrideUgx: z.number().int().min(-1).max(5_000_000).optional(),
  platformFeeOverridePercent: z.number().min(0).max(50).optional(),
  whiteLabelMode: z.boolean().optional(),
});

/** Live fee quote without saving — used by developer dashboard fee automations. */
export async function POST(req: Request) {
  try {
    const gate = await requireDeveloperSession();
    if (!gate.ok) return gate.response;

    const parsed = PreviewBody.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid body", details: parsed.error.flatten() }, { status: 400 });
    }

    const d = parsed.data;
    const sample = await quoteMerchantChargeFees({
      developerAppId: gate.app.id,
      orderAmountUgx: d.sampleOrderUgx ?? 25_000,
      draft: {
        platformFeePayer: d.platformFeePayer,
        merchantSurchargePercent: d.merchantSurchargePercent,
        merchantSurchargeFixedUgx: d.merchantSurchargeFixedUgx,
        platformFeeOverrideKind: d.platformFeeOverrideKind,
        platformFeeOverrideUgx: d.platformFeeOverrideUgx,
        platformFeeOverridePercent: d.platformFeeOverridePercent,
        whiteLabelMode: d.whiteLabelMode,
      },
    });

    return NextResponse.json({ sampleFeeQuote: sample, preview: true, saved: false });
  } catch (e) {
    return apiErrorResponse(e, { route: "POST /api/developers/merchant-settings/preview" });
  }
}
