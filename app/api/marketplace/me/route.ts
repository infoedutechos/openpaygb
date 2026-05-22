// app/api/marketplace/me/route.ts
/**
 * Marketplace – current user: balance, my listings, my trades
 */

import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { validateTelegramWebAppData } from '@/utils/server-checks';

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

  const dbUser = await prisma.user.findUnique({
    where: { telegramId },
    select: {
      pointsBalance: true,
      pointsInMarketplace: true,
      marketplaceListings: {
        orderBy: { createdAt: 'desc' },
        take: 50,
      },
      marketplaceTradesAsBuyer: {
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: { listing: { select: { sellerId: true } } },
      },
    },
  });

  if (!dbUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const listings = dbUser.marketplaceListings.map((l) => ({
    id: l.id,
    amount: l.amount,
    remainingAmount: l.remainingAmount,
    currency: l.currency,
    status: l.status,
    createdAt: l.createdAt.toISOString(),
  }));

  const tradesAsBuyer = dbUser.marketplaceTradesAsBuyer.map((t) => ({
    id: t.id,
    listingId: t.listingId,
    amount: t.amount,
    amountPaid: t.amountPaid,
    sellerReceived: t.sellerReceived,
    fee: t.fee,
    currency: t.currency,
    status: t.status,
    createdAt: t.createdAt.toISOString(),
  }));

  return NextResponse.json({
    pointsBalance: dbUser.pointsBalance,
    pointsInMarketplace: dbUser.pointsInMarketplace,
    listings,
    trades: tradesAsBuyer,
  });
}
