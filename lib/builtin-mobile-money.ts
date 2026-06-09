/** Built-in PSPs configured via environment (shown alongside DB providers in Master Admin). */

import { deploymentEnv } from "@/lib/deployment-env-resolve";

export type BuiltinProviderStatus = {
  code: string;
  name: string;
  kind: "builtin";
  webhookPath: string;
  configured: boolean;
  active: boolean;
  notes: string;
};

export function getBuiltinMobileMoneyProviders(): BuiltinProviderStatus[] {
  const appUrl = deploymentEnv("NEXT_PUBLIC_APP_URL") || "https://your-domain";

  return [
    {
      code: "momo",
      name: "MoMo (MTN / Airtel bridge)",
      kind: "builtin",
      webhookPath: `${appUrl}/api/webhooks/momo`,
      configured: Boolean(deploymentEnv("MOMO_WEBHOOK_SECRET")),
      active: Boolean(deploymentEnv("MOMO_WEBHOOK_SECRET")),
      notes: "Env: MOMO_WEBHOOK_SECRET, MOMO_COLLECTION_URL. Header: x-momo-webhook-secret.",
    },
    {
      code: "mbiyo",
      name: "Mbiyo rail (OpenPayGB brand)",
      kind: "builtin",
      webhookPath: `${appUrl}/api/webhooks/mbiyo`,
      configured: Boolean(deploymentEnv("MBIYO_WEBHOOK_SECRET")),
      active: Boolean(deploymentEnv("MBIYO_WEBHOOK_SECRET") && deploymentEnv("MBIYO_SECRET_KEY")),
      notes: "Env: MBIYO_WEBHOOK_SECRET, MBIYO_SECRET_KEY. HMAC-SHA256 body signature.",
    },
    {
      code: "livepay",
      name: "LivePay rail (OpenPayGB brand)",
      kind: "builtin",
      webhookPath: `${appUrl}/api/webhooks/livepay`,
      configured: Boolean(deploymentEnv("LIVEPAY_API_KEY") && deploymentEnv("LIVEPAY_ACCOUNT_NUMBER")),
      active: Boolean(deploymentEnv("LIVEPAY_API_KEY") && deploymentEnv("LIVEPAY_ACCOUNT_NUMBER")),
      notes: "Env: LIVEPAY_API_KEY, LIVEPAY_ACCOUNT_NUMBER. Optional: LIVEPAY_WEBHOOK_SECRET header.",
    },
    {
      code: "relworx",
      name: "Relworx rail (OpenPayGB brand)",
      kind: "builtin",
      webhookPath: `${appUrl}/api/webhooks/relworx`,
      configured: Boolean(
        deploymentEnv("RELWORX_API_KEY") &&
          deploymentEnv("RELWORX_ACCOUNT_NO") &&
          deploymentEnv("RELWORX_ENABLED") !== "false",
      ),
      active: Boolean(
        deploymentEnv("RELWORX_API_KEY") &&
          deploymentEnv("RELWORX_ACCOUNT_NO") &&
          deploymentEnv("RELWORX_ENABLED") !== "false",
      ),
      notes: "Env: RELWORX_API_KEY, RELWORX_ACCOUNT_NO, RELWORX_WEBHOOK_KEY. Optional: RELWORX_CURRENCY, RELWORX_WEBHOOK_URL.",
    },
    {
      code: "vixonpay",
      name: "VixonPay rail (OpenPayGB brand)",
      kind: "builtin",
      webhookPath: `${appUrl}/api/webhooks/vixonpay`,
      configured: Boolean(deploymentEnv("VIXONPAY_API_KEY")),
      active: Boolean(deploymentEnv("VIXONPAY_API_KEY")),
      notes: "Env: VIXONPAY_API_KEY, VIXONPAY_WEBHOOK_SECRET. Optional: VIXONPAY_WEBHOOK_URL.",
    },
  ];
}
