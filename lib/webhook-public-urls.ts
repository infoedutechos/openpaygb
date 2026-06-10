import "server-only";

import { deploymentEnv } from "@/lib/deployment-env-resolve";
import { getLivePayWebhookUrl } from "@/lib/livepay/webhook-url";

function appBaseUrl(): string {
  return (deploymentEnv("NEXT_PUBLIC_APP_URL") || "https://odelpay.vercel.app").replace(/\/$/, "");
}

export function getMbiyoWebhookUrl(): string {
  return `${appBaseUrl()}/api/webhooks/mbiyo`;
}

export function getMomoWebhookUrl(): string {
  return `${appBaseUrl()}/api/webhooks/momo`;
}

export function getLivePayPublicWebhookUrl(): string {
  return getLivePayWebhookUrl() ?? `${appBaseUrl()}/api/webhooks/livepay`;
}

export type WebhookProviderAlignment = {
  code: "mbiyo" | "momo" | "livepay";
  name: string;
  webhookUrl: string;
  secretEnvVar: string;
  secretConfigured: boolean;
  headerOrSignature: string;
  dashboardUrl: string | null;
  docsPath: string;
};

export function getWebhookProviderAlignment(): WebhookProviderAlignment[] {
  return [
    {
      code: "mbiyo",
      name: "Mbiyo",
      webhookUrl: getMbiyoWebhookUrl(),
      secretEnvVar: "MBIYO_WEBHOOK_SECRET",
      secretConfigured: Boolean(deploymentEnv("MBIYO_WEBHOOK_SECRET")),
      headerOrSignature: "HMAC-SHA256 of raw body → Signature / X-Signature header",
      dashboardUrl: "https://dashboard.mbiyo.africa/user/profile/index/api",
      docsPath: "docs/MBIYO_WEBHOOK_SETUP.md",
    },
    {
      code: "momo",
      name: "MoMo bridge",
      webhookUrl: getMomoWebhookUrl(),
      secretEnvVar: "MOMO_WEBHOOK_SECRET",
      secretConfigured: Boolean(deploymentEnv("MOMO_WEBHOOK_SECRET")),
      headerOrSignature: "Plain shared secret → x-momo-webhook-secret header",
      dashboardUrl: null,
      docsPath: "docs/WEBHOOK_SECRETS_ALIGNMENT.md",
    },
    {
      code: "livepay",
      name: "LivePay",
      webhookUrl: getLivePayPublicWebhookUrl(),
      secretEnvVar: "LIVEPAY_WEBHOOK_SECRET",
      secretConfigured: Boolean(deploymentEnv("LIVEPAY_WEBHOOK_SECRET")),
      headerOrSignature: "HMAC X-Webhook-Signature (or legacy x-livepay-webhook-secret)",
      dashboardUrl: "https://livepay.me/",
      docsPath: "docs/WEBHOOK_SECRETS_ALIGNMENT.md",
    },
  ];
}
