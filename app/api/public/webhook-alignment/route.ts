import { NextResponse } from "next/server";
import { warmDeploymentEnvCache } from "@/lib/deployment-env-resolve";
import { getWebhookProviderAlignment } from "@/lib/webhook-public-urls";

/** Public webhook URL + secret-configured flags for Mbiyo, MoMo, LivePay (no secret values). */
export async function GET() {
  await warmDeploymentEnvCache();
  const providers = getWebhookProviderAlignment();
  return NextResponse.json({
    providers,
    allSecretsConfigured: providers.every((p) => p.secretConfigured),
    note: "Copy webhookUrl and the matching env secret into each PSP dashboard. Secrets are never returned by this API.",
  });
}
