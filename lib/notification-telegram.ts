import type { PlatformAudience } from "@prisma/client";
import { deploymentEnv, warmDeploymentEnvCache } from "@/lib/deployment-env-resolve";
import { prisma } from "@/lib/prisma";
import {
  broadcastNotificationToUserBotChats,
  formatAnnouncementMessage,
  sendAnnouncementToChannel,
  sendTelegramMessage,
  sendTelegramPhoto,
} from "@/utils/telegram-notify";

export type TelegramDispatchOpts = {
  notificationId: string;
  title: string;
  body: string;
  imageUrl?: string | null;
  audience: PlatformAudience;
  postToTelegram?: boolean;
  sendToUserBotChats?: boolean;
};

/** Resolve Telegram chat IDs for platform notification audience. */
export async function resolveTelegramIdsForAudience(audience: PlatformAudience): Promise<string[]> {
  const ids = new Set<string>();

  if (audience === "all" || audience === "play") {
    const users = await prisma.user.findMany({
      select: { telegramId: true },
    });
    for (const u of users) {
      const id = u.telegramId?.trim();
      if (id) ids.add(id);
    }
  }

  if (audience === "all" || audience === "tuition") {
    const students = await prisma.student.findMany({
      where: { telegramId: { not: "" } },
      select: { telegramId: true },
    });
    for (const s of students) {
      const id = s.telegramId?.trim();
      if (id) ids.add(id);
    }
  }

  return [...ids];
}

const BATCH_SIZE = 25;
const DELAY_MS = 1100;

/**
 * Send a platform notification to Telegram channel and/or user bot chats.
 * Persists NotificationDelivery rows when notificationId is provided (enables recall).
 */
export function dispatchPlatformNotificationToTelegram(opts: TelegramDispatchOpts): void {
  const postToChannel = opts.postToTelegram !== false;
  const sendToUsers = opts.sendToUserBotChats !== false;

  void (async () => {
    await warmDeploymentEnvCache();

    if (postToChannel) {
      const ok = await sendAnnouncementToChannel(opts.title, opts.body, opts.imageUrl);
      if (!ok && deploymentEnv("TELEGRAM_ANNOUNCEMENT_CHANNEL_ID")) {
        console.warn("[notification-telegram] Failed to post to Telegram channel");
      }
    }
  })();

  if (!sendToUsers) return;

  void (async () => {
    try {
      const telegramIds = await resolveTelegramIdsForAudience(opts.audience);
      if (telegramIds.length === 0) return;

      const messageText = formatAnnouncementMessage(opts.title, opts.body);
      const hasImage = typeof opts.imageUrl === "string" && opts.imageUrl.trim().length > 0;

      for (let offset = 0; offset < telegramIds.length; offset += BATCH_SIZE) {
        const batch = telegramIds.slice(offset, offset + BATCH_SIZE);
        await Promise.all(
          batch.map(async (telegramId) => {
            const messageId = hasImage
              ? await sendTelegramPhoto(telegramId, opts.imageUrl!.trim(), messageText)
              : await sendTelegramMessage(telegramId, messageText);
            if (typeof messageId === "number") {
              await prisma.notificationDelivery.upsert({
                where: {
                  notificationId_telegramId: {
                    notificationId: opts.notificationId,
                    telegramId,
                  },
                },
                create: {
                  notificationId: opts.notificationId,
                  telegramId,
                  messageId,
                },
                update: { messageId },
              });
            }
          }),
        );
        if (offset + BATCH_SIZE < telegramIds.length) {
          await new Promise((r) => setTimeout(r, DELAY_MS));
        }
      }
    } catch (err) {
      console.warn("[notification-telegram] dispatch failed", err);
      // Fallback: legacy broadcast without delivery tracking
      const telegramIds = await resolveTelegramIdsForAudience(opts.audience).catch(() => [] as string[]);
      if (telegramIds.length > 0) {
        broadcastNotificationToUserBotChats(
          telegramIds,
          opts.title,
          opts.body,
          opts.imageUrl,
        );
      }
    }
  })();
}
