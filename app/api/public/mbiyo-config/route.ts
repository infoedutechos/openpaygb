import { NextResponse } from "next/server";
import { deploymentEnv, warmDeploymentEnvCache } from "@/lib/deployment-env-resolve";
import { isMbiyoActiveForCheckout } from "@/lib/payment-provider-active";
import { mbiyoSupportedCountryCodes } from "@/lib/mbiyo/supported-countries";
import { getMbiyoWebhookUrl } from "@/lib/webhook-public-urls";

export async function GET() {
  await warmDeploymentEnvCache();
  return NextResponse.json({
    enabled: await isMbiyoActiveForCheckout(),
    countries: mbiyoSupportedCountryCodes(),
    webhookUrl: getMbiyoWebhookUrl(),
    webhookSecretConfigured: Boolean(deploymentEnv("MBIYO_WEBHOOK_SECRET")),
    signatureHeader: "Signature / X-Signature (HMAC-SHA256 of raw body)",
  });
}
