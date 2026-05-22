/**
 * Donation center – donate PEARLS points for charity
 * POST: { initData, amount } – deduct from balance, create donation, update totalDonatedPoints
 * GET: ?initData=... – return user's totalDonatedPoints (for UI)
 */

import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { validateTelegramWebAppData } from '@/utils/server-checks';
import { DONATION_MIN } from '@/utils/consts';
import { getOrCreateFeeRecipientUser } from '@/utils/fee-recipient';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
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
  try {
    const dbUser = await prisma.user.findUnique({
      where: { telegramId },
      select: { totalDonatedPoints: true },
    });
    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    return NextResponse.json({
      totalDonatedPoints: dbUser.totalDonatedPoints ?? 0,
    });
  } catch (e) {
    console.error('[donate GET]', e);
    return NextResponse.json({ error: 'Failed to load' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { initData, amount } = body;
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

  const amt = Math.floor(Number(amount));
  if (!Number.isFinite(amt) || amt < DONATION_MIN) {
    return NextResponse.json(
      { error: `Minimum donation is ${DONATION_MIN.toLocaleString()} PEARLS` },
      { status: 400 }
    );
  }

  try {
    const dbUser = await prisma.user.findUnique({
      where: { telegramId },
    });
    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    if (dbUser.isFrozen) {
      return NextResponse.json({ error: 'Account is frozen' }, { status: 403 });
    }
    if (dbUser.pointsBalance < amt) {
      return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 });
    }

    const feeRecipient = await getOrCreateFeeRecipientUser(prisma);

    const [updatedUser] = await prisma.$transaction([
      prisma.user.update({
        where: { id: dbUser.id },
        data: {
          pointsBalance: { decrement: amt },
          totalDonatedPoints: { increment: amt },
        },
      }),
      prisma.user.update({
        where: { id: feeRecipient.id },
        data: { pointsBalance: { increment: amt } },
      }),
      prisma.charityDonation.create({
        data: {
          userId: dbUser.id,
          amount: amt,
        },
      }),
      prisma.transfer.create({
        data: {
          senderId: dbUser.id,
          recipientId: feeRecipient.id,
          amount: amt,
          feeAmount: 0,
          isDonation: true,
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      amount: amt,
      pointsBalance: updatedUser.pointsBalance,
      totalDonatedPoints: updatedUser.totalDonatedPoints,
    });
  } catch (e) {
    console.error('[donate POST]', e);
    return NextResponse.json({ error: 'Donation failed' }, { status: 500 });
  }
}
