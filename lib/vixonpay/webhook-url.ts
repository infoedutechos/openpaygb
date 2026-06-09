import { deploymentEnv } from "@/lib/deployment-env-resolve";

/** Public webhook URL registered in the VixonPay dashboard (no trailing slash on base). */
export function getVixonPayWebhookUrl(): string | null {
  const explicit = deploymentEnv("VIXONPAY_WEBHOOK_URL");
  if (explicit) return explicit.replace(/\/$/, "");

  const base = deploymentEnv("NEXT_PUBLIC_APP_URL");
  if (!base) return null;
  return `${base.replace(/\/$/, "")}/api/webhooks/vixonpay`;
}
