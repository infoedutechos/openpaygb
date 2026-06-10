import { NextRequest, NextResponse } from 'next/server';
import { listCardsForUser } from '@/lib/cards-for-user';
import { validateTelegramWebAppData } from '@/utils/server-checks';
import prisma from '@/utils/prisma';

import { apiErrorResponse } from "@/lib/api-error";
export async function GET(req: NextRequest) {
  try {
  const initData = req.nextUrl.searchParams.get('initData');
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

  const dbUser = await prisma.user.findUnique({ where: { telegramId }, select: { id: true } });
  if (!dbUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const cards = await listCardsForUser(dbUser.id);
  return NextResponse.json({
    cards: cards.map((c) => ({
      id: c.id,
      slug: c.slug,
      name: c.name,
      description: c.description,
      image: c.image,
      category: c.category,
      unlockType: c.unlockType,
      unlockPayload: c.unlockPayload,
      bonusType: c.bonusType,
      bonusValue: c.bonusValue,
      owned: c.owned,
    })),
  });

  } catch (e) {
    return apiErrorResponse(e, { route: "cards/get", fallback: "Request failed" });
  }
}
