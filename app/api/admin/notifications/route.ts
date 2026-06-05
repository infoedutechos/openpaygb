// app/api/admin/notifications/route.ts
// Admin: list all notifications, create new. Optionally post to Telegram channel and/or send to each user's bot chat.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/utils/prisma';
import { isAdminAuthorized } from '@/utils/admin-session';
import { getAdminFromCookies } from '@/lib/auth';
import { sendAnnouncementToChannel, broadcastNotificationToUserBotChats } from '@/utils/telegram-notify';

function adminNotificationsAuthorized(req: Request): Promise<boolean> {
  return getAdminFromCookies().then((pay) => Boolean(pay) || isAdminAuthorized(req));
}

export async function GET(req: Request) {
  if (!(await adminNotificationsAuthorized(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const notifications = await prisma.notification.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}

const CreateNotificationBody = z.object({
  title: z.string().min(1).max(200),
  body: z.string().max(5000).optional().default(''),
  imageUrl: z.string().max(2000).optional().nullable(),
  videoUrl: z.string().max(2000).optional().nullable(),
  isActive: z.boolean().optional().default(true),
  postToTelegram: z.boolean().optional().default(true),
  sendToUserBotChats: z.boolean().optional().default(true),
});

export async function POST(req: NextRequest) {
  if (!(await adminNotificationsAuthorized(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  try {
    const json = await req.json().catch(() => null);
    const parsed = CreateNotificationBody.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid body', details: parsed.error.flatten() }, { status: 400 });
    }
    const body = parsed.data;
    const notification = await prisma.notification.create({
      data: {
        title: body.title.trim(),
        body: body.body.trim(),
        imageUrl: body.imageUrl?.trim() ? body.imageUrl.trim() : null,
        videoUrl: body.videoUrl?.trim() ? body.videoUrl.trim() : null,
        isActive: body.isActive !== false,
      },
    });

    const postToChannel = body.postToTelegram !== false;
    if (postToChannel) {
      sendAnnouncementToChannel(
        notification.title,
        notification.body ?? '',
        notification.imageUrl
      ).then((ok) => {
        if (!ok && process.env.TELEGRAM_ANNOUNCEMENT_CHANNEL_ID) {
          console.warn('[admin/notifications] Failed to post to Telegram channel');
        }
      });
    }

    // Send to each user's Telegram bot chat so notification appears in both in-app/profile and bot chat
    const sendToUserBotChats = body.sendToUserBotChats !== false;
    if (sendToUserBotChats) {
      prisma.user
        .findMany({ select: { telegramId: true } })
        .then((users) => {
          const telegramIds = users.map((u) => u.telegramId).filter((id): id is string => id != null && id.trim() !== '');
          broadcastNotificationToUserBotChats(
            telegramIds,
            notification.title,
            notification.body ?? '',
            notification.imageUrl
          );
        })
        .catch((err) => console.warn('[admin/notifications] Failed to send to user bot chats', err));
    }

    return NextResponse.json(notification);
  } catch (error) {
    console.error('Error creating notification:', error);
    return NextResponse.json(
      { error: 'Failed to create notification' },
      { status: 500 }
    );
  }
}
