import { NextResponse } from "next/server";
import { getOpenPayCardPlatformSettings } from "@/lib/openpay-card-settings";
import { OPEN_PAY_BRAND } from "@/lib/open-pay-brand";

export async function GET() {
  const settings = await getOpenPayCardPlatformSettings();
  return NextResponse.json({
    enabled: settings.enabled,
    issueFeeTon: settings.issueFeeTon,
    brand: OPEN_PAY_BRAND,
    currency: "UGX",
  });
}
