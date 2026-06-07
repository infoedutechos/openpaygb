import { getActiveOrganizationBySlug } from "@/lib/organizations";
import { getDefaultOrganizationId } from "@/lib/default-organization";
import { deploymentEnv, warmDeploymentEnvCache } from "@/lib/deployment-env-resolve";

/** Tenant for the Telegram bot (`TELEGRAM_ORG_SLUG`, else default org). */
export async function getTelegramOrganizationId(): Promise<string> {
  await warmDeploymentEnvCache();
  const slug = deploymentEnv("TELEGRAM_ORG_SLUG").toLowerCase();
  if (slug) {
    const org = await getActiveOrganizationBySlug(slug);
    if (org) return org.id;
  }
  return getDefaultOrganizationId();
}

export function telegramOrganizationSlug(): string {
  return deploymentEnv("TELEGRAM_ORG_SLUG").toLowerCase() || "default";
}
