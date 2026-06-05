/** Public webhook URL registered in the LivePay dashboard (no trailing slash on base). */
export function getLivePayWebhookUrl(): string | null {
  const explicit = process.env.LIVEPAY_WEBHOOK_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");

  const base = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!base) return null;
  return `${base.replace(/\/$/, "")}/api/webhooks/livepay`;
}
