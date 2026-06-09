import { NextResponse } from "next/server";
import { deploymentEnv, warmDeploymentEnvCache } from "@/lib/deployment-env-resolve";
import { relworxCheckoutCurrency } from "@/lib/relworx/client";
import { isRelworxActiveForCheckout } from "@/lib/payment-provider-active";
import { getRelworxWebhookUrl } from "@/lib/relworx/webhook-url";

/** Public flag: Relworx MoMo checkout when platform keys are set. */
export async function GET() {
  await warmDeploymentEnvCache();
  return NextResponse.json({
    enabled: await isRelworxActiveForCheckout(),
    currency: relworxCheckoutCurrency(),
    countries: ["UG", "KE", "TZ"],
    webhookUrl: getRelworxWebhookUrl(),
    webhookKeyConfigured: Boolean(
      deploymentEnv("RELWORX_WEBHOOK_KEY") || deploymentEnv("RELWORX_WEBHOOK_SECRET"),
    ),
  });
}
