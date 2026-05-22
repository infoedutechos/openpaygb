// app/api/marketplace/listings/route.ts
/**
 * Marketplace listings
 * GET: list active listings (for buy tab)
 * POST: create listing (sell)
 */

import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { validateTelegramWebAppData } from '@/utils/server-checks';
import { MARKETPLACE_MIN_LISTING } from '@/utils/consts';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const initData = searchParams.get('initData');

  if (!initData) {
    return NextResponse.json({ error: 'Missing initData' }, { status: 400 });
  }

  const { validatedData } = validateTelegramWebAppData(initData);
  if (!validatedData) {
    return NextResponse.json({ error: 'Invalid Telegram data' }, { status: 403 });
  }

  const listings = await prisma.marketplaceListing.findMany({
    where: { status: 'active', remainingAmount: { gt: 0 } },
    orderBy: { createdAt: 'desc' },
    include: {
      seller: {
        select: { name: true, telegramId: true, tonWalletAddress: true },
      },
    },
  });

  const items = listings.map((l) => ({
    id: l.id,
    sellerId: l.sellerId,
    sellerName: l.seller.name ?? 'Seller',
    sellerTonAddress: l.seller.tonWalletAddress ?? undefined,
    amount: l.remainingAmount,
    totalAmount: l.amount,
    pricePerUnit: l.pricePerUnit,
    currency: l.currency,
    createdAt: l.createdAt.toISOString(),
  }));

  return NextResponse.json({ listings: items });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { initData, amount, priceInTon } = body;

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

  if (!dbUser.tonWalletAddress) {
    return NextResponse.json({ error: 'Connect your TON wallet (Drops tab) to receive TON' }, { status: 400 });
  }

  const amt = Number(amount);
  if (!Number.isFinite(amt) || amt < MARKETPLACE_MIN_LISTING) {
    return NextResponse.json(
      { error: `Minimum listing is ${MARKETPLACE_MIN_LISTING.toLocaleString()} PEARLS` },
      { status: 400 }
    );
  }

  const priceTon = Number(priceInTon);
  if (!Number.isFinite(priceTon) || priceTon <= 0) {
    return NextResponse.json({ error: 'Enter a valid price in TON (e.g. 0.001 per 1000 PEARLS)' }, { status: 400 });
  }

  // priceInTon = TON per 1000 PEARLS → pricePerUnit = TON per 1 PEARLS
  const pricePerUnit = priceTon / 1000;

  const amountToLock = Math.floor(amt);
  if (dbUser.pointsBalance < amountToLock) {
    return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 });
  }

  const [, listing] = await prisma.$transaction([
    prisma.user.update({
      where: { id: dbUser.id },
      data: {
        pointsBalance: { decrement: amountToLock },
        whitePearls: { decrement: amountToLock },
        pointsInMarketplace: { increment: amountToLock },
      },
    }),
    prisma.marketplaceListing.create({
      data: {
        sellerId: dbUser.id,
        amount: amountToLock,
        remainingAmount: amountToLock,
        pricePerUnit,
        currency: 'ton',
        status: 'active',
      },
    }),
  ]);

  const updatedUser = await prisma.user.findUnique({
    where: { id: dbUser.id },
    select: { pointsBalance: true, pointsInMarketplace: true },
  });

  return NextResponse.json({
    success: true,
    listing: {
      id: listing.id,
      amount: listing.amount,
      remainingAmount: listing.remainingAmount,
      currency: listing.currency,
      createdAt: listing.createdAt.toISOString(),
    },
    pointsBalance: updatedUser?.pointsBalance,
    pointsInMarketplace: updatedUser?.pointsInMarketplace,
  });
}
