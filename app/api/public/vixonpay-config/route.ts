import { NextResponse } from "next/server";
import { deploymentEnv, warmDeploymentEnvCache } from "@/lib/deployment-env-resolve";
import { isVixonPayActiveForCheckout } from "@/lib/payment-provider-active";
import { getVixonPayWebhookUrl } from "@/lib/vixonpay/webhook-url";

/** Public flag: Uganda VixonPay MoMo available when platform API key is set. */
export async function GET() {
  await warmDeploymentEnvCache();
  return NextResponse.json({
    enabled: await isVixonPayActiveForCheckout(),
    currency: "UGX",
    webhookUrl: getVixonPayWebhookUrl(),
    webhookSecretConfigured: Boolean(deploymentEnv("VIXONPAY_WEBHOOK_SECRET")),
  });
}
