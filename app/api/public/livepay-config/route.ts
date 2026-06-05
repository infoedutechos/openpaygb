import { NextResponse } from "next/server";
import { deploymentEnv, warmDeploymentEnvCache } from "@/lib/deployment-env-resolve";
import { isLivePayConfigured } from "@/lib/livepay/client";
import { getLivePayWebhookUrl } from "@/lib/livepay/webhook-url";

/** Public flag: Uganda LivePay checkout available when platform keys are set. */
export async function GET() {
  await warmDeploymentEnvCache();
  return NextResponse.json({
    enabled: isLivePayConfigured(),
    networks: ["MTN", "AIRTEL"],
    currency: "UGX",
    webhookUrl: getLivePayWebhookUrl(),
    webhookSecretConfigured: Boolean(deploymentEnv("LIVEPAY_WEBHOOK_SECRET")),
  });
}


