import { deploymentEnv } from "@/lib/deployment-env-resolve";

/** Public webhook URL registered in the Relworx business account settings. */
export function getRelworxWebhookUrl(): string | null {
  const explicit = deploymentEnv("RELWORX_WEBHOOK_URL");
  if (explicit) return explicit.replace(/\/$/, "");

  const base = deploymentEnv("NEXT_PUBLIC_APP_URL");
  if (!base) return null;
  return `${base.replace(/\/$/, "")}/api/webhooks/relworx`;
}
