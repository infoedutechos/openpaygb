import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api-error";
import { getMerchantChargeForPublic, serializeMerchantCharge } from "@/lib/merchant-charge";
import { merchantChargesSandboxEnabled } from "@/lib/merchant-charge-momo";
import { isValidObjectId } from "@/lib/object-id";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    if (!isValidObjectId(id)) {
      return NextResponse.json({ error: "Invalid charge id" }, { status: 400 });
    }

    const row = await getMerchantChargeForPublic(id);
    if (!row) return NextResponse.json({ error: "Charge not found" }, { status: 404 });

    const app = row.developerApp;
    return NextResponse.json({
      charge: serializeMerchantCharge(row),
      merchant: {
        name: app.brandingName || app.name,
        logoUrl: app.brandingLogoUrl || null,
        primaryColor: app.brandingPrimaryColor || null,
        accentColor: app.brandingAccentColor || null,
        whiteLabelMode: Boolean(app.whiteLabelMode),
        supportEmail: app.supportEmail || null,
        supportUrl: app.supportUrl || null,
      },
      sandbox: merchantChargesSandboxEnabled(),
    });
  } catch (e) {
    return apiErrorResponse(e, { route: "GET /api/public/charges/[id]" });
  }
}
