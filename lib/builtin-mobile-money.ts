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
      name: "MbiyoPay / OpenPayGlobal",
      kind: "builtin",
      webhookPath: `${appUrl}/api/webhooks/mbiyo`,
      configured: Boolean(process.env.MBIYO_WEBHOOK_SECRET?.trim()),
      active: Boolean(process.env.MBIYO_WEBHOOK_SECRET?.trim() && process.env.MBIYO_SECRET_KEY?.trim()),
      notes: "Env: MBIYO_WEBHOOK_SECRET, MBIYO_SECRET_KEY. HMAC-SHA256 body signature.",
    },
  ];
}
