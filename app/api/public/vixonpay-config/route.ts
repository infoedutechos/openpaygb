import { NextResponse } from "next/server";
import { deploymentEnv, warmDeploymentEnvCache } from "@/lib/deployment-env-resolve";
import { isVixonPayConfigured } from "@/lib/vixonpay/client";
import { getVixonPayWebhookUrl } from "@/lib/vixonpay/webhook-url";

/** Public flag: Uganda VixonPay MoMo available when platform API key is set. */
export async function GET() {
  await warmDeploymentEnvCache();
  return NextResponse.json({
    enabled: isVixonPayConfigured(),
    currency: "UGX",
    webhookUrl: getVixonPayWebhookUrl(),
    webhookSecretConfigured: Boolean(deploymentEnv("VIXONPAY_WEBHOOK_SECRET")),
  });
}
