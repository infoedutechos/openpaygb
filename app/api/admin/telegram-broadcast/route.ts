// app/api/admin/telegram-broadcast/route.ts
// Admin-only: send a message to every user's Telegram bot chat (no in-app notification, no user profiles).

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { isAdminAuthorized } from '@/utils/admin-session';
import {
  sendTelegramMessage,
  sendTelegramPhoto,
  formatAnnouncementMessage,
  type TelegramInlineButton,
  type TelegramReplyButton,
} from '@/utils/telegram-notify';

export async function POST(req: NextRequest) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { title, body: bodyText, imageUrl, inlineKeyboard, replyKeyboard } = body;

    if (!title || typeof title !== 'string' || !title.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const messageText = formatAnnouncementMessage(
      title.trim(),
      typeof bodyText === 'string' ? bodyText.trim() : ''
    );

    const safeInline =
      Array.isArray(inlineKeyboard) && inlineKeyboard.length
        ? (inlineKeyboard as TelegramInlineButton[][])
            .filter((row) => Array.isArray(row))
            .map((row) =>
              row
                .filter((b) => b && typeof (b as { text?: string }).text === 'string')
                .map((b) => ({
                  text: (b as { text: string }).text,
                  url: (b as { url?: string }).url,
                  callback_data: (b as { callback_data?: string }).callback_data,
                }))
            )
            .filter((row) => row.length > 0)
        : undefined;
    const safeReply =
      Array.isArray(replyKeyboard) && replyKeyboard.length
        ? (replyKeyboard as TelegramReplyButton[][])
            .filter((row) => Array.isArray(row))
            .map((row) =>
              row
                .filter((b) => b && typeof (b as { text?: string }).text === 'string')
                .map((b) => ({ text: (b as { text: string }).text }))
            )
            .filter((row) => row.length > 0)
        : undefined;
    const sendOptions =
      safeInline?.length || safeReply?.length
        ? { inlineKeyboard: safeInline, replyKeyboard: safeReply }
        : undefined;
    const usePhoto = typeof imageUrl === 'string' && imageUrl.trim().length > 0;

    const users = await prisma.user.findMany({ select: { telegramId: true } });
    const BATCH_SIZE = 25;
    const delayMs = 1100;
    let sentCount = 0;

    for (let offset = 0; offset < users.length; offset += BATCH_SIZE) {
      const batch = users.slice(offset, offset + BATCH_SIZE);
      const results = await Promise.all(
        batch.map(async (u) => {
          const id = usePhoto
            ? await sendTelegramPhoto(u.telegramId, imageUrl.trim(), messageText, {
                inlineKeyboard: safeInline,
              })
            : await sendTelegramMessage(u.telegramId, messageText, sendOptions);
          return typeof id === 'number' ? 1 : 0;
        })
      );
      sentCount += results.reduce((a: number, b) => a + b, 0);
      if (offset + BATCH_SIZE < users.length) {
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }

    return NextResponse.json({ success: true, sentCount, totalUsers: users.length });
  } catch (error) {
    console.error('[admin/telegram-broadcast]', error);
    return NextResponse.json({ error: 'Failed to send broadcast' }, { status: 500 });
  }
}
