import { NextResponse } from "next/server";
import { isRelworxConfigured, relworxCheckoutCurrency } from "@/lib/relworx/client";
import { getRelworxWebhookUrl } from "@/lib/relworx/webhook-url";

/** Public flag: Relworx MoMo checkout when platform keys are set. */
export async function GET() {
  return NextResponse.json({
    enabled: isRelworxConfigured(),
    currency: relworxCheckoutCurrency(),
    countries: ["UG", "KE", "TZ"],
    webhookUrl: getRelworxWebhookUrl(),
    webhookKeyConfigured: Boolean(
      process.env.RELWORX_WEBHOOK_KEY?.trim() || process.env.RELWORX_WEBHOOK_SECRET?.trim(),
    ),
  });
}
