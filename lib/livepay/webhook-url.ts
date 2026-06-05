import { deploymentEnv } from "@/lib/deployment-env-resolve";

/** Public webhook URL registered in the LivePay dashboard (no trailing slash on base). */
export function getLivePayWebhookUrl(): string | null {
  const explicit = deploymentEnv("LIVEPAY_WEBHOOK_URL");
  if (explicit) return explicit.replace(/\/$/, "");

  const base = deploymentEnv("NEXT_PUBLIC_APP_URL");
  if (!base) return null;
  return `${base.replace(/\/$/, "")}/api/webhooks/livepay`;
}
