// app/api/admin/notifications/route.ts
// Admin: list all notifications, create new. Optionally post to Telegram channel and/or send to each user's bot chat.

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { isAdminAuthorized } from '@/utils/admin-session';
import { sendAnnouncementToChannel, broadcastNotificationToUserBotChats } from '@/utils/telegram-notify';

export async function GET() {
  // Notifications panel is public (no admin password); allow read without auth
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

export async function POST(req: NextRequest) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  try {
    const body = await req.json();
    const { title, body: bodyText, imageUrl, videoUrl, isActive } = body;
    if (!title || typeof title !== 'string' || !title.trim()) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }
    const notification = await prisma.notification.create({
      data: {
        title: title.trim(),
        body: typeof bodyText === 'string' ? bodyText.trim() : '',
        imageUrl: typeof imageUrl === 'string' && imageUrl.trim() ? imageUrl.trim() : null,
        videoUrl: typeof videoUrl === 'string' && videoUrl.trim() ? videoUrl.trim() : null,
        isActive: isActive !== false,
      },
    });

    // Optionally post to Telegram channel
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
