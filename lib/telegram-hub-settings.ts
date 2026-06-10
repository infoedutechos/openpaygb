import "server-only";

import { warmDeploymentEnvCache } from "@/lib/deployment-env-resolve";
import { prisma } from "@/lib/prisma";
import { getTelegramPublicStatus } from "@/lib/telegram-public-status";
import {
  invalidatePublicSiteUiCache,
  mergeSocialLinks,
  parseStoredSocialLinks,
  PLATFORM_SITE_UI_KEY,
} from "@/lib/site-ui-settings";

export const TELEGRAM_HUB_CHANNEL_DEFAULTS = {
  name: "ODEL HUB Official Channel",
  url: "https://t.me/+quY6fGi9uHxhNjhk",
  channelId: "-1003916461172",
} as const;

export type TelegramHubSettings = {
  officialChannelName: string;
  officialChannelUrl: string;
  officialChannelId: string;
  botUsername: string | null;
  botTokenConfigured: boolean;
  webhookUrl: string;
  webhookSecretConfigured: boolean;
  miniAppPath: string;
  masterEmail: string;
  masterTelegramId: string | null;
};

function resolveChannelFields(row: {
  telegramOfficialChannelName?: string | null;
  telegramOfficialChannelUrl?: string | null;
  telegramOfficialChannelId?: string | null;
} | null) {
  const name =
    row?.telegramOfficialChannelName?.trim() || TELEGRAM_HUB_CHANNEL_DEFAULTS.name;
  const url = row?.telegramOfficialChannelUrl?.trim() || TELEGRAM_HUB_CHANNEL_DEFAULTS.url;
  const channelId =
    row?.telegramOfficialChannelId?.trim() || TELEGRAM_HUB_CHANNEL_DEFAULTS.channelId;
  return { name, url, channelId };
}

function botUsernameFromEnv(): string | null {
  const raw = process.env.NEXT_PUBLIC_BOT_USERNAME?.trim();
  if (!raw) return null;
  return raw.replace(/^@/, "");
}

async function syncOfficialChannelSocialLink(name: string, url: string) {
  const row = await prisma.siteUiSettings.findUnique({
    where: { key: PLATFORM_SITE_UI_KEY },
    select: { socialLinks: true },
  });
  const stored = parseStoredSocialLinks(row?.socialLinks);
  const merged = mergeSocialLinks(stored);
  const socialLinks = merged.map((link) =>
    link.key === "telegram_channel"
      ? {
          ...link,
          label: name,
          url,
          enabled: Boolean(url.trim()),
          showInFooter: true,
        }
      : link,
  );

  await prisma.siteUiSettings.upsert({
    where: { key: PLATFORM_SITE_UI_KEY },
    create: { key: PLATFORM_SITE_UI_KEY, socialLinks },
    update: { socialLinks },
  });
}

export async function persistTelegramHubChannel(input: {
  officialChannelName: string;
  officialChannelUrl: string;
  officialChannelId: string;
}) {
  const officialChannelName = input.officialChannelName.trim() || TELEGRAM_HUB_CHANNEL_DEFAULTS.name;
  const officialChannelUrl = input.officialChannelUrl.trim() || TELEGRAM_HUB_CHANNEL_DEFAULTS.url;
  const officialChannelId =
    input.officialChannelId.trim() || TELEGRAM_HUB_CHANNEL_DEFAULTS.channelId;

  await prisma.siteUiSettings.upsert({
    where: { key: PLATFORM_SITE_UI_KEY },
    create: {
      key: PLATFORM_SITE_UI_KEY,
      telegramOfficialChannelName: officialChannelName,
      telegramOfficialChannelUrl: officialChannelUrl,
      telegramOfficialChannelId: officialChannelId,
    },
    update: {
      telegramOfficialChannelName: officialChannelName,
      telegramOfficialChannelUrl: officialChannelUrl,
      telegramOfficialChannelId: officialChannelId,
    },
  });

  await syncOfficialChannelSocialLink(officialChannelName, officialChannelUrl);
  invalidatePublicSiteUiCache();

  return { officialChannelName, officialChannelUrl, officialChannelId };
}

export async function ensureTelegramHubChannelDefaults() {
  const row = await prisma.siteUiSettings.findUnique({
    where: { key: PLATFORM_SITE_UI_KEY },
    select: {
      telegramOfficialChannelName: true,
      telegramOfficialChannelUrl: true,
      telegramOfficialChannelId: true,
    },
  });

  const hasStored =
    Boolean(row?.telegramOfficialChannelUrl?.trim()) ||
    Boolean(row?.telegramOfficialChannelName?.trim()) ||
    Boolean(row?.telegramOfficialChannelId?.trim());

  if (!hasStored) {
    await persistTelegramHubChannel({
      officialChannelName: TELEGRAM_HUB_CHANNEL_DEFAULTS.name,
      officialChannelUrl: TELEGRAM_HUB_CHANNEL_DEFAULTS.url,
      officialChannelId: TELEGRAM_HUB_CHANNEL_DEFAULTS.channelId,
    });
  }
}

export async function getTelegramHubSettings(master: {
  email: string;
  id: string;
}): Promise<TelegramHubSettings> {
  await ensureTelegramHubChannelDefaults();

  const [row, masterRow] = await Promise.all([
    prisma.siteUiSettings.findUnique({
      where: { key: PLATFORM_SITE_UI_KEY },
      select: {
        telegramOfficialChannelName: true,
        telegramOfficialChannelUrl: true,
        telegramOfficialChannelId: true,
      },
    }),
    prisma.adminUser.findUnique({
      where: { id: master.id },
      select: { telegramId: true },
    }),
  ]);

  const { name, url, channelId } = resolveChannelFields(row);

  await warmDeploymentEnvCache();
  const telegram = getTelegramPublicStatus();

  return {
    officialChannelName: name,
    officialChannelUrl: url,
    officialChannelId: channelId,
    botUsername: telegram.botUsername ?? botUsernameFromEnv(),
    botTokenConfigured: telegram.botTokenConfigured,
    webhookUrl: telegram.webhookUrl,
    webhookSecretConfigured: telegram.webhookSecretConfigured,
    miniAppPath: telegram.miniAppPath,
    masterEmail: master.email,
    masterTelegramId: masterRow?.telegramId?.trim() || null,
  };
}
