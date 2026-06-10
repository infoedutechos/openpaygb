/**
 * My transfers – sent and received history for the current user
 * GET: ?initData=
 */

import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { validateTelegramWebAppData } from '@/utils/server-checks';

import { apiErrorResponse } from "@/lib/api-error";
export async function GET(req: Request) {
  try {
  const { searchParams } = new URL(req.url);
  const initData = searchParams.get('initData');

  if (!initData) {
    return NextResponse.json({ error: 'Missing initData' }, { status: 400 });
  }

  const { validatedData, user } = validateTelegramWebAppData(initData);
  if (!validatedData) {
    return NextResponse.json({ error: 'Invalid Telegram data' }, { status: 403 });
  }

  const telegramId = user.id?.toString();
  if (!telegramId) {
    return NextResponse.json({ error: 'Invalid user data' }, { status: 400 });
  }

  const dbUser = await prisma.user.findUnique({ where: { telegramId } });
  if (!dbUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const [sent, received] = await Promise.all([
    prisma.transfer.findMany({
      where: { senderId: dbUser.id, isFeeTransfer: { not: true } },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        recipient: { select: { name: true, telegramId: true } },
      },
    }),
    prisma.transfer.findMany({
      where: { recipientId: dbUser.id, isFeeTransfer: { not: true } },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        sender: { select: { name: true, telegramId: true } },
      },
    }),
  ]);

  const formatTransfer = (
    t: { id: string; amount: number; feeAmount?: number | null; createdAt: Date; isDonation?: boolean },
    other: { name: string | null; telegramId: string },
    type: 'sent' | 'received'
  ) => ({
    id: t.id,
    type,
    amount: Math.floor(t.amount),
    feeAmount: Math.floor(t.feeAmount ?? 0),
    otherName: other.name ?? `User ${other.telegramId.slice(-4)}`,
    otherTelegramId: other.telegramId,
    createdAt: t.createdAt.toISOString(),
    isDonation: t.isDonation ?? false,
  });

  const sentItems = sent.map((t) =>
    formatTransfer(t, t.recipient, 'sent')
  );
  const receivedItems = received.map((t) =>
    formatTransfer(t, t.sender, 'received')
  );

  const all = [
    ...sentItems.map((s) => ({ item: s, t: new Date(s.createdAt).getTime() })),
    ...receivedItems.map((r) => ({ item: r, t: new Date(r.createdAt).getTime() })),
  ]
    .sort((a, b) => b.t - a.t)
    .slice(0, 100)
    .map(({ item }) => item);

  return NextResponse.json({
    sent: sentItems,
    received: receivedItems,
    all,
  });

  } catch (e) {
    return apiErrorResponse(e, { route: "transfers/me/get", fallback: "Request failed" });
  }
}
