/** Public webhook URL registered in the Relworx business account settings. */
export function getRelworxWebhookUrl(): string | null {
  const explicit = process.env.RELWORX_WEBHOOK_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");

  const base = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!base) return null;
  return `${base.replace(/\/$/, "")}/api/webhooks/relworx`;
}
