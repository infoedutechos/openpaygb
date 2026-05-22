// Admin: delete this announcement from all users' Telegram chats (recall)
// Returns immediately and processes in background to avoid timeouts.

import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { isAdminAuthorized } from '@/utils/admin-session';
import { deleteTelegramMessage } from '@/utils/telegram-notify';

const BATCH_SIZE = 25;
const DELAY_MS = 1100;

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdminAuthorized(_req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  const { id: notificationId } = await params;
  try {
    const deliveries = await prisma.notificationDelivery.findMany({
      where: { notificationId },
      select: { telegramId: true, messageId: true },
    });
    if (deliveries.length === 0) {
      return NextResponse.json({
        ok: true,
        deleted: 0,
        message: 'No messages were sent to users for this notification, or they were already recalled.',
      });
    }
    // Run deletions in background so the request returns quickly (avoids timeout / "Failed to fetch")
    void (async () => {
      try {
        for (let i = 0; i < deliveries.length; i += BATCH_SIZE) {
          const batch = deliveries.slice(i, i + BATCH_SIZE);
          await Promise.all(
            batch.map((d) => deleteTelegramMessage(d.telegramId, d.messageId))
          );
          if (i + BATCH_SIZE < deliveries.length) {
            await new Promise((r) => setTimeout(r, DELAY_MS));
          }
        }
        await prisma.notificationDelivery.deleteMany({ where: { notificationId } });
      } catch (err) {
        console.error('[admin/notifications] recall background failed:', err);
      }
    })();
    return NextResponse.json({
      ok: true,
      message: "Recall started. Messages are being removed from users' chats.",
      total: deliveries.length,
    });
  } catch (error) {
    console.error('[admin/notifications] recall failed:', error);
    return NextResponse.json(
      { error: 'Failed to recall announcement' },
      { status: 500 }
    );
  }
}
