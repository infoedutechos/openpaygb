/**
 * Tuition payments are confirmed automatically via TonAPI cron (`/api/cron/confirm-ton`)
 * and MoMo webhooks. Manual admin confirmation is an optional edge-case override.
 *
 * Precedence: env `ADMIN_MANUAL_PAYMENT_CONFIRM=false|true` overrides Master Auth Policy;
 * otherwise SiteUiSettings.adminManualPaymentConfirm (default true).
 */
import { getPlatformAuthPolicy } from "@/lib/platform-customisation";

function envOverride(): boolean | null {
  const v = process.env.ADMIN_MANUAL_PAYMENT_CONFIRM?.trim().toLowerCase();
  if (v === "false" || v === "0" || v === "no") return false;
  if (v === "true" || v === "1" || v === "yes") return true;
  return null;
}

/** Sync env-only check (tests / fallback). Prefer the async helper in request paths. */
export function isAdminManualPaymentConfirmAllowed(): boolean {
  const env = envOverride();
  if (env !== null) return env;
  return true;
}

export async function resolveAdminManualPaymentConfirmAllowed(): Promise<boolean> {
  const env = envOverride();
  if (env !== null) return env;
  const policy = await getPlatformAuthPolicy();
  return policy.adminManualPaymentConfirm;
}
