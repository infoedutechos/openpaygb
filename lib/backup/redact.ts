/** Strip non-restorable secrets from backup rows before export. */

export function redactPartnerApiKeyRow(row: Record<string, unknown>): Record<string, unknown> {
  const rest: Record<string, unknown> = { ...row };
  delete rest.keyHash;
  return { ...rest, keyHash: "", _exportNote: "keyHash omitted — re-issue API keys after restore" };
}

export function redactPartnerWebhookRow(row: Record<string, unknown>): Record<string, unknown> {
  return { ...row, secret: "", _exportNote: "secret omitted — reconfigure webhook signing after restore" };
}

export function redactMobileMoneyProviderRow(row: Record<string, unknown>): Record<string, unknown> {
  return { ...row, webhookSecret: "", _exportNote: "webhookSecret omitted — re-enter in Master Admin after restore" };
}
