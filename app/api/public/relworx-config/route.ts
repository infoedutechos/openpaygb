import { NextResponse } from "next/server";
import { deploymentEnv, warmDeploymentEnvCache } from "@/lib/deployment-env-resolve";
import { isRelworxConfigured, relworxCheckoutCurrency } from "@/lib/relworx/client";
import { getRelworxWebhookUrl } from "@/lib/relworx/webhook-url";

/** Public flag: Relworx MoMo checkout when platform keys are set. */
export async function GET() {
  await warmDeploymentEnvCache();
  return NextResponse.json({
    enabled: isRelworxConfigured(),
    currency: relworxCheckoutCurrency(),
    countries: ["UG", "KE", "TZ"],
    webhookUrl: getRelworxWebhookUrl(),
    webhookKeyConfigured: Boolean(
      deploymentEnv("RELWORX_WEBHOOK_KEY") || deploymentEnv("RELWORX_WEBHOOK_SECRET"),
    ),
  });
}
