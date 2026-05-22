/**
 * Recent transfers – global feed of all transactions
 * GET: ?initData=&limit=50
 */

import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { validateTelegramWebAppData } from '@/utils/server-checks';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const initData = searchParams.get('initData');
  const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10) || 50, 100);

  if (!initData) {
    return NextResponse.json({ error: 'Missing initData' }, { status: 400 });
  }

  const { validatedData } = validateTelegramWebAppData(initData);
  if (!validatedData) {
    return NextResponse.json({ error: 'Invalid Telegram data' }, { status: 403 });
  }

  const transfers = await prisma.transfer.findMany({
    where: { isFeeTransfer: { not: true } },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      sender: { select: { name: true, telegramId: true } },
      recipient: { select: { name: true, telegramId: true } },
    },
  });

  const items = transfers.map((t) => ({
    id: t.id,
    amount: Math.floor(t.amount),
    feeAmount: Math.floor(t.feeAmount ?? 0),
    senderName: t.sender.name ?? `User ${t.sender.telegramId.slice(-4)}`,
    senderTelegramId: t.sender.telegramId,
    recipientName: t.recipient.name ?? `User ${t.recipient.telegramId.slice(-4)}`,
    recipientTelegramId: t.recipient.telegramId,
    createdAt: t.createdAt.toISOString(),
    isDonation: t.isDonation ?? false,
  }));

  return NextResponse.json({ transfers: items });
}
