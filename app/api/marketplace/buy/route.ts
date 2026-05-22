// app/api/marketplace/buy/route.ts
/**
 * Buy PEARLS from a listing – pay with TON (buyer sends TON on-chain, then we credit PEARLS)
 */

import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { validateTelegramWebAppData } from '@/utils/server-checks';

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { initData, listingId, amount: requestedAmount } = body;

  if (!initData || !listingId) {
    return NextResponse.json({ error: 'Missing initData or listingId' }, { status: 400 });
  }

  const { validatedData, user } = validateTelegramWebAppData(initData);
  if (!validatedData) {
    return NextResponse.json({ error: 'Invalid Telegram data' }, { status: 403 });
  }

  const telegramId = user.id?.toString();
  if (!telegramId) {
    return NextResponse.json({ error: 'Invalid user data' }, { status: 400 });
  }

  const buyer = await prisma.user.findUnique({ where: { telegramId } });
  if (!buyer) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const listing = await prisma.marketplaceListing.findUnique({
    where: { id: listingId },
    include: { seller: true },
  });

  if (!listing || listing.status !== 'active') {
    return NextResponse.json({ error: 'Listing not found or not active' }, { status: 404 });
  }

  if (listing.currency !== 'ton') {
    return NextResponse.json({ error: 'This listing is not for TON' }, { status: 400 });
  }

  if (listing.sellerId === buyer.id) {
    return NextResponse.json({ error: 'Cannot buy your own listing' }, { status: 400 });
  }

  const amount = Number(requestedAmount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
  }

  const buyAmount = Math.floor(amount);
  if (buyAmount > listing.remainingAmount) {
    return NextResponse.json(
      { error: `Max available: ${listing.remainingAmount.toLocaleString()} PEARLS` },
      { status: 400 }
    );
  }

  // TON: buyer already sent TON on-chain via TonConnect; we credit PEARLS
  const tonPaid = buyAmount * listing.pricePerUnit;
  const fee = 0;
  const sellerReceivedTon = tonPaid;

  await prisma.$transaction([
    prisma.user.update({
      where: { id: buyer.id },
      data: {
        pointsBalance: { increment: buyAmount },
        whitePearls: { increment: buyAmount },
        points: { increment: buyAmount },
      },
    }),
    prisma.user.update({
      where: { id: listing.sellerId },
      data: { pointsInMarketplace: { decrement: buyAmount } },
    }),
    prisma.marketplaceListing.update({
      where: { id: listingId },
      data: {
        remainingAmount: { decrement: buyAmount },
        status: listing.remainingAmount - buyAmount <= 0 ? 'filled' : 'partial',
        updatedAt: new Date(),
      },
    }),
    prisma.marketplaceTrade.create({
      data: {
        listingId,
        buyerId: buyer.id,
        amount: buyAmount,
        amountPaid: tonPaid,
        sellerReceived: sellerReceivedTon,
        fee,
        currency: 'ton',
        status: 'completed',
      },
    }),
  ]);

  const updatedBuyer = await prisma.user.findUnique({
    where: { id: buyer.id },
    select: { pointsBalance: true },
  });

  return NextResponse.json({
    success: true,
    amount: buyAmount,
    amountPaidTon: tonPaid,
    pointsBalance: updatedBuyer?.pointsBalance,
  });
}
