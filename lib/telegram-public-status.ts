import "server-only";

import { deploymentEnv, resolvedBotToken } from "@/lib/deployment-env-resolve";

function appBaseUrl(): string {
  return (deploymentEnv("NEXT_PUBLIC_APP_URL") || "https://odelpay.vercel.app").replace(/\/$/, "");
}

export function getTelegramWebhookUrl(): string {
  return `${appBaseUrl()}/api/webhooks/telegram`;
}

export function getTelegramPublicStatus() {
  const botToken = resolvedBotToken();
  const webhookSecret = deploymentEnv("TELEGRAM_WEBHOOK_SECRET");
  const botUsername = deploymentEnv("NEXT_PUBLIC_BOT_USERNAME")?.replace(/^@/, "") || null;
  return {
    botTokenConfigured: Boolean(botToken),
    botUsername,
    webhookUrl: getTelegramWebhookUrl(),
    webhookSecretConfigured: Boolean(webhookSecret),
    announcementChannelId: deploymentEnv("TELEGRAM_ANNOUNCEMENT_CHANNEL_ID") || null,
    miniAppPath: "/tma",
  };
}
