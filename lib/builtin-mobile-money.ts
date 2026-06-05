/** Built-in PSPs configured via environment (shown alongside DB providers in Master Admin). */

export type BuiltinProviderStatus = {
  code: string;
  name: string;
  kind: "builtin";
  webhookPath: string;
  configured: boolean;
  active: boolean;
  notes: string;
};

export function getBuiltinMobileMoneyProviders(): BuiltinProviderStatus[] {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || "https://your-domain";

  return [
    {
      code: "momo",
      name: "MoMo (MTN / Airtel bridge)",
      kind: "builtin",
      webhookPath: `${appUrl}/api/webhooks/momo`,
      configured: Boolean(process.env.MOMO_WEBHOOK_SECRET?.trim()),
      active: Boolean(process.env.MOMO_WEBHOOK_SECRET?.trim()),
      notes: "Env: MOMO_WEBHOOK_SECRET, MOMO_COLLECTION_URL. Header: x-momo-webhook-secret.",
    },
    {
      code: "mbiyo",
      name: "Mbiyo rail (OpenPayGB brand)",
      kind: "builtin",
      webhookPath: `${appUrl}/api/webhooks/mbiyo`,
      configured: Boolean(process.env.MBIYO_WEBHOOK_SECRET?.trim()),
      active: Boolean(process.env.MBIYO_WEBHOOK_SECRET?.trim() && process.env.MBIYO_SECRET_KEY?.trim()),
      notes: "Env: MBIYO_WEBHOOK_SECRET, MBIYO_SECRET_KEY. HMAC-SHA256 body signature.",
    },
    {
      code: "livepay",
      name: "LivePay rail (OpenPayGB brand)",
      kind: "builtin",
      webhookPath: `${appUrl}/api/webhooks/livepay`,
      configured: Boolean(
        process.env.LIVEPAY_API_KEY?.trim() && process.env.LIVEPAY_ACCOUNT_NUMBER?.trim(),
      ),
      active: Boolean(process.env.LIVEPAY_API_KEY?.trim() && process.env.LIVEPAY_ACCOUNT_NUMBER?.trim()),
      notes: "Env: LIVEPAY_API_KEY, LIVEPAY_ACCOUNT_NUMBER. Optional: LIVEPAY_WEBHOOK_SECRET header.",
    },
    {
      code: "relworx",
      name: "Relworx rail (OpenPayGB brand)",
      kind: "builtin",
      webhookPath: `${appUrl}/api/webhooks/relworx`,
      configured: Boolean(
        process.env.RELWORX_API_KEY?.trim() &&
          process.env.RELWORX_ACCOUNT_NO?.trim() &&
          process.env.RELWORX_ENABLED !== "false",
      ),
      active: Boolean(
        process.env.RELWORX_API_KEY?.trim() &&
          process.env.RELWORX_ACCOUNT_NO?.trim() &&
          process.env.RELWORX_ENABLED !== "false",
      ),
      notes: "Env: RELWORX_API_KEY, RELWORX_ACCOUNT_NO, RELWORX_WEBHOOK_KEY. Optional: RELWORX_CURRENCY, RELWORX_WEBHOOK_URL.",
    },
  ];
}
