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

export function getFlutterwaveWebhookUrl(): string {
  return `${appBaseUrl()}/api/webhooks/flutterwave`;
}

export function getPaystackWebhookUrl(): string {
  return `${appBaseUrl()}/api/webhooks/paystack`;
}

export function getVisaIssuingWebhookUrl(): string {
  return `${appBaseUrl()}/api/webhooks/visa-issuing`;
}

export type WebhookProviderAlignment = {
  code: "mbiyo" | "momo" | "livepay" | "flutterwave" | "paystack" | "visa_issuing";
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
    {
      code: "flutterwave",
      name: "Flutterwave (card acquiring)",
      webhookUrl: getFlutterwaveWebhookUrl(),
      secretEnvVar: "FLUTTERWAVE_WEBHOOK_SECRET",
      secretConfigured: Boolean(
        deploymentEnv("FLUTTERWAVE_WEBHOOK_SECRET") || deploymentEnv("FLUTTERWAVE_SECRET_KEY"),
      ),
      headerOrSignature: "verif-hash header equals secret (or HMAC when configured)",
      dashboardUrl: "https://dashboard.flutterwave.com/",
      docsPath: "docs/platform/OPENPAYGB_GATEWAY_MATURITY.md",
    },
    {
      code: "paystack",
      name: "Paystack (card acquiring)",
      webhookUrl: getPaystackWebhookUrl(),
      secretEnvVar: "PAYSTACK_SECRET_KEY",
      secretConfigured: Boolean(deploymentEnv("PAYSTACK_SECRET_KEY")),
      headerOrSignature: "HMAC-SHA512 of raw body → x-paystack-signature",
      dashboardUrl: "https://dashboard.paystack.com/",
      docsPath: "docs/platform/OPENPAYGB_GATEWAY_MATURITY.md",
    },
    {
      code: "visa_issuing",
      name: "Visa / network issuing",
      webhookUrl: getVisaIssuingWebhookUrl(),
      secretEnvVar: "VISA_WEBHOOK_SECRET",
      secretConfigured: Boolean(deploymentEnv("VISA_WEBHOOK_SECRET")),
      headerOrSignature: "Shared secret → x-visa-webhook-secret (partner-dependent)",
      dashboardUrl: "https://developer.visa.com/",
      docsPath: "docs/platform/CARD_ISSUING.md",
    },
  ];
}
