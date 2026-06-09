import { NextResponse } from "next/server";
import { deploymentEnv, warmDeploymentEnvCache } from "@/lib/deployment-env-resolve";
import { isLivePayActiveForCheckout } from "@/lib/payment-provider-active";
import { getLivePayWebhookUrl } from "@/lib/livepay/webhook-url";

/** Public flag: Uganda LivePay checkout available when platform keys are set. */
export async function GET() {
  await warmDeploymentEnvCache();
  return NextResponse.json({
    enabled: await isLivePayActiveForCheckout(),
    networks: ["MTN", "AIRTEL"],
    currency: "UGX",
    webhookUrl: getLivePayWebhookUrl(),
    webhookSecretConfigured: Boolean(deploymentEnv("LIVEPAY_WEBHOOK_SECRET")),
  });
}


