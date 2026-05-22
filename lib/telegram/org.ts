import { getActiveOrganizationBySlug } from "@/lib/organizations";
import { getDefaultOrganizationId } from "@/lib/default-organization";

/** Tenant for the Telegram bot (`TELEGRAM_ORG_SLUG`, else default org). */
export async function getTelegramOrganizationId(): Promise<string> {
  const slug = process.env.TELEGRAM_ORG_SLUG?.trim().toLowerCase();
  if (slug) {
    const org = await getActiveOrganizationBySlug(slug);
    if (org) return org.id;
  }
  return getDefaultOrganizationId();
}

export function telegramOrganizationSlug(): string {
  return process.env.TELEGRAM_ORG_SLUG?.trim().toLowerCase() || "default";
}
