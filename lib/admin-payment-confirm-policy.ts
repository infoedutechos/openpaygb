/**
 * Tuition payments are confirmed automatically via TonAPI cron (`/api/cron/confirm-ton`)
 * and MoMo webhooks. Manual admin confirmation is an optional edge-case override.
 *
 * Set **ADMIN_MANUAL_PAYMENT_CONFIRM=false** to disable `PATCH` status=confirmed and the
 * admin UI "Confirm" button (fully autonomous confirmations only). Set **true** or leave
 * unset to keep the override available (default, backward compatible).
 */
export function isAdminManualPaymentConfirmAllowed(): boolean {
  const v = process.env.ADMIN_MANUAL_PAYMENT_CONFIRM?.trim().toLowerCase();
  if (v === "false" || v === "0" || v === "no") return false;
  return true;
}
