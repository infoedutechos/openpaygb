import { NextResponse } from "next/server";
import { warmDeploymentEnvCache, deploymentEnv } from "@/lib/deployment-env-resolve";
import {
  cardAcquiringProvider,
  isCardAcquiringConfigured,
} from "@/lib/card-acquiring";
import { isPaymentProviderEnabledByMaster, getPaymentProviderPolicy } from "@/lib/payment-provider-policy";
import { getFlutterwaveWebhookUrl, getPaystackWebhookUrl } from "@/lib/webhook-public-urls";

export async function GET() {
  await warmDeploymentEnvCache();
  const provider = cardAcquiringProvider();
  const configured = isCardAcquiringConfigured();
  const policy = await getPaymentProviderPolicy();
  const enabledByMaster = isPaymentProviderEnabledByMaster("card", policy);
  const enabled = configured && enabledByMaster;

  return NextResponse.json({
    enabled,
    configured,
    enabledByMaster,
    provider,
    currency: "UGX",
    webhookUrl:
      provider === "flutterwave"
        ? getFlutterwaveWebhookUrl()
        : provider === "paystack"
          ? getPaystackWebhookUrl()
          : null,
    webhookSecretConfigured: Boolean(
      provider === "flutterwave"
        ? deploymentEnv("FLUTTERWAVE_WEBHOOK_SECRET") || deploymentEnv("FLUTTERWAVE_SECRET_KEY")
        : deploymentEnv("PAYSTACK_SECRET_KEY"),
    ),
  });
}
