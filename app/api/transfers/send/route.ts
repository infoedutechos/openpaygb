/**
 * Send PEARLS – P2P transfer to another user by Telegram ID
 * POST: { initData, recipientTelegramId, amount }
 */

import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { validateTelegramWebAppData } from '@/utils/server-checks';
import { TRANSFER_MIN, TRANSFER_MAX, TRANSFER_DAILY_LIMIT, TRANSFER_FEE_PERCENT, TRANSFER_FEE_RECIPIENT_TELEGRAM_ID } from '@/utils/consts';
import { notifyTransfer } from '@/utils/telegram-notify';

function startOfDayUTC(date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { initData, recipientTelegramId, amount } = body;

  if (!initData) {
    return NextResponse.json({ error: 'Missing initData' }, { status: 400 });
  }

  const { validatedData, user } = validateTelegramWebAppData(initData);
  if (!validatedData) {
    return NextResponse.json({ error: 'Invalid Telegram data' }, { status: 403 });
  }

  const senderTelegramId = user.id?.toString();
  if (!senderTelegramId) {
    return NextResponse.json({ error: 'Invalid user data' }, { status: 400 });
  }

  const recipientIdStr = String(recipientTelegramId || '').trim();
  if (!recipientIdStr) {
    return NextResponse.json({ error: 'Recipient Telegram ID is required' }, { status: 400 });
  }

  // Prevent self-transfer
  if (recipientIdStr === senderTelegramId) {
    return NextResponse.json({ error: 'Cannot send PEARLS to yourself' }, { status: 400 });
  }

  const amt = Math.floor(Number(amount));
  if (!Number.isFinite(amt) || amt <= 0) {
    return NextResponse.json({ error: 'Amount must be a positive number' }, { status: 400 });
  }

  if (amt < TRANSFER_MIN) {
    return NextResponse.json(
      { error: `Minimum transfer is ${TRANSFER_MIN.toLocaleString()} PEARLS` },
      { status: 400 }
    );
  }

  if (amt > TRANSFER_MAX) {
    return NextResponse.json(
      { error: `Maximum transfer per transaction is ${TRANSFER_MAX.toLocaleString()} PEARLS` },
      { status: 400 }
    );
  }

  const [dbSender, dbRecipient] = await Promise.all([
    prisma.user.findUnique({ where: { telegramId: senderTelegramId } }),
    prisma.user.findUnique({ where: { telegramId: recipientIdStr } }),
  ]);

  if (!dbSender) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  if (!dbRecipient) {
    return NextResponse.json({ error: 'Recipient not found. Use their Telegram ID.' }, { status: 404 });
  }

  if (dbSender.isFrozen) {
    return NextResponse.json({ error: 'Account is frozen' }, { status: 403 });
  }

  if (dbRecipient.isFrozen) {
    return NextResponse.json({ error: 'Recipient account is frozen' }, { status: 400 });
  }

  const fee = Math.floor((amt * TRANSFER_FEE_PERCENT) / 100);
  const netAmount = amt - fee;

  if (dbSender.pointsBalance < amt) {
    return NextResponse.json({ error: 'Insufficient PEARLS balance' }, { status: 400 });
  }

  const todayStart = startOfDayUTC(new Date());
  const sentToday = await prisma.transfer.aggregate({
    where: {
      senderId: dbSender.id,
      createdAt: { gte: todayStart },
    },
    _sum: { amount: true },
  });
  const totalSentToday = sentToday._sum.amount ?? 0;

  if (totalSentToday + amt > TRANSFER_DAILY_LIMIT) {
    return NextResponse.json(
      {
        error: `Daily limit exceeded. You can send ${(TRANSFER_DAILY_LIMIT - totalSentToday).toLocaleString()} PEARLS more today.`,
      },
      { status: 400 }
    );
  }

  // Ensure fee recipient user exists (create minimal user if not)
  let dbFeeRecipient = await prisma.user.findUnique({
    where: { telegramId: TRANSFER_FEE_RECIPIENT_TELEGRAM_ID },
  });
  if (!dbFeeRecipient) {
    dbFeeRecipient = await prisma.user.create({
      data: {
        telegramId: TRANSFER_FEE_RECIPIENT_TELEGRAM_ID,
        name: 'Treasury',
      },
    });
  }

  const result = await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: dbSender.id },
      data: { pointsBalance: { decrement: amt } },
    });
    await tx.user.update({
      where: { id: dbRecipient.id },
      data: { pointsBalance: { increment: netAmount } },
    });
    await tx.user.update({
      where: { id: dbFeeRecipient.id },
      data: { pointsBalance: { increment: fee } },
    });
    const mainTransfer = await tx.transfer.create({
      data: {
        senderId: dbSender.id,
        recipientId: dbRecipient.id,
        amount: netAmount,
        feeAmount: fee,
        isFeeTransfer: false,
      },
      include: {
        recipient: { select: { name: true, telegramId: true } },
      },
    });
    await tx.transfer.create({
      data: {
        senderId: dbSender.id,
        recipientId: dbFeeRecipient.id,
        amount: fee,
        feeAmount: 0,
        isFeeTransfer: true,
        parentTransferId: mainTransfer.id,
      },
    });
    const updatedSender = await tx.user.findUnique({
      where: { id: dbSender.id },
      select: { pointsBalance: true },
    });
    return { mainTransfer, updatedSender };
  });
  const { mainTransfer, updatedSender } = result;

  // Optional Telegram notifications (net amount to recipient, full amount as "sent" for sender)
  const senderName = dbSender.name ?? `User ${dbSender.telegramId.slice(-4)}`;
  const recipientName = mainTransfer.recipient.name ?? `User ${mainTransfer.recipient.telegramId.slice(-4)}`;
  notifyTransfer(
    senderTelegramId,
    mainTransfer.recipient.telegramId,
    netAmount,
    senderName,
    recipientName
  );

  return NextResponse.json({
    success: true,
    transfer: {
      id: mainTransfer.id,
      amount: mainTransfer.amount,
      feePercent: TRANSFER_FEE_PERCENT,
      feeAmount: mainTransfer.feeAmount,
      recipientName,
      recipientTelegramId: mainTransfer.recipient.telegramId,
      createdAt: mainTransfer.createdAt.toISOString(),
    },
    pointsBalance: updatedSender?.pointsBalance ?? dbSender.pointsBalance - amt,
  });
}
