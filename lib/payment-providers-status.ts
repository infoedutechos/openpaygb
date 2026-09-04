import "server-only";

import { deploymentEnv } from "@/lib/deployment-env-resolve";
import { isMbiyoConfigured } from "@/lib/mbiyo/config";
import { isLivePayConfigured } from "@/lib/livepay/client";
import { isRelworxConfigured } from "@/lib/relworx/client";
import { isVixonPayConfigured } from "@/lib/vixonpay/client";
import { isCardAcquiringConfigured, cardAcquiringProvider } from "@/lib/card-acquiring";
import { isCardIssuingConfigured } from "@/lib/card-issuing/types";
import {
  getFlutterwaveWebhookUrl,
  getPaystackWebhookUrl,
  getVisaIssuingWebhookUrl,
} from "@/lib/webhook-public-urls";
import { getOpenPayCardPlatformSettings } from "@/lib/openpay-card-settings";
import {
  PAYMENT_PROVIDER_CATALOG,
  type PaymentProviderCatalogEntry,
} from "@/lib/payment-providers-catalog";
import {
  getPaymentProviderPolicy,
  isPaymentProviderEnabledByMaster,
  type PaymentProviderPolicy,
} from "@/lib/payment-provider-policy";

export type PaymentProviderRow = PaymentProviderCatalogEntry & {
  configured: boolean;
  enabledByMaster: boolean;
  activeForPayments: boolean;
  webhookUrl: string | null;
  credentialsAnchor: string;
};

function appOrigin(): string {
  return (deploymentEnv("NEXT_PUBLIC_APP_URL") || "").replace(/\/$/, "");
}

function isProviderConfigured(code: string): boolean {
  switch (code) {
    case "momo":
      return Boolean(deploymentEnv("MOMO_WEBHOOK_SECRET"));
    case "mbiyo":
      return isMbiyoConfigured();
    case "livepay":
      return isLivePayConfigured();
    case "relworx":
      return isRelworxConfigured();
    case "vixonpay":
      return isVixonPayConfigured();
    case "ton":
      return Boolean(deploymentEnv("ODELHUB_TON_WALLET_ADDRESS"));
    case "openpay_card":
      return true;
    case "card":
      return isCardAcquiringConfigured();
    case "card_issuing":
      return isCardIssuingConfigured();
    case "telegram":
      return Boolean(deploymentEnv("TELEGRAM_BOT_TOKEN") || deploymentEnv("BOT_TOKEN"));
    default:
      return false;
  }
}

function webhookUrlFor(code: string): string | null {
  const base = appOrigin();
  if (!base) return null;
  switch (code) {
    case "momo":
      return `${base}/api/webhooks/momo`;
    case "mbiyo":
      return `${base}/api/webhooks/mbiyo`;
    case "livepay":
      return `${base}/api/webhooks/livepay`;
    case "relworx":
      return `${base}/api/webhooks/relworx`;
    case "vixonpay":
      return `${base}/api/webhooks/vixonpay`;
    case "telegram":
      return `${base}/api/webhooks/telegram`;
    case "card": {
      const p = cardAcquiringProvider();
      if (p === "flutterwave") return getFlutterwaveWebhookUrl();
      if (p === "paystack") return getPaystackWebhookUrl();
      return `${base}/api/webhooks/flutterwave`;
    }
    case "card_issuing":
      return getVisaIssuingWebhookUrl();
    default:
      return null;
  }
}

export function isPaymentProviderActive(
  code: string,
  policy?: PaymentProviderPolicy,
): boolean {
  const c = code.trim().toLowerCase();
  if (!isPaymentProviderEnabledByMaster(c, policy)) return false;
  if (c === "openpay_card") return true;
  return isProviderConfigured(c);
}

export async function getMasterPaymentProviderRows(): Promise<{
  providers: PaymentProviderRow[];
  policy: PaymentProviderPolicy;
  appUrl: string;
}> {
  const { warmDeploymentEnvCache } = await import("@/lib/deployment-env-resolve");
  await warmDeploymentEnvCache();

  const [policy, openPaySettings] = await Promise.all([
    getPaymentProviderPolicy(),
    getOpenPayCardPlatformSettings(),
  ]);

  const effectivePolicy: PaymentProviderPolicy = {
    ...policy,
    openpay_card: openPaySettings.enabled,
  };

  const appUrl = appOrigin();

  const providers: PaymentProviderRow[] = PAYMENT_PROVIDER_CATALOG.map((entry) => {
    const configured = isProviderConfigured(entry.code);
    const enabledByMaster =
      entry.code === "openpay_card"
        ? openPaySettings.enabled
        : isPaymentProviderEnabledByMaster(entry.code, effectivePolicy);
    const activeForPayments =
      entry.code === "openpay_card" ? enabledByMaster : configured && enabledByMaster;

    return {
      ...entry,
      configured,
      enabledByMaster,
      activeForPayments,
      webhookUrl: webhookUrlFor(entry.code),
      credentialsAnchor:
        entry.code === "openpay_card"
          ? "#openpay-card-settings"
          : entry.code === "livepay" || entry.code === "relworx" || entry.code === "vixonpay"
            ? "#ug-momo-credentials"
            : entry.code === "card" || entry.code === "card_issuing"
              ? "#card-network"
              : entry.envVars.length > 0
                ? "#deployment-environment"
                : "#payment-providers",
    };
  });

  return { providers, policy: effectivePolicy, appUrl };
}
