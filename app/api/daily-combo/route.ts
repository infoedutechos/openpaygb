/**
 * Matrix (Daily Combo) - pick today's 3 cards in order (Hybrid: auto from templates + admin override)
 * GET: card pool, today's attempt status (attemptsLeft, claimed), reward
 * POST: submit selectedSlugs [3], validate against today's combo, grant reward or use attempt
 */

import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { validateTelegramWebAppData } from '@/utils/server-checks';
import { DAILY_COMBO_MAX_ATTEMPTS, DAILY_COMBO_REWARD } from '@/utils/consts';
import { creditWhitePearlsInstant } from '@/utils/pearls';

function getStartOfDayUTC(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

async function getOrCreateTodayCombo(): Promise<{ cardSlugs: string[] }> {
  const now = new Date();
  const today = getStartOfDayUTC(now);

  let combo = await prisma.dailyCombo.findUnique({
    where: { date: today },
  });

  if (combo && combo.cardSlugs.length === 3) {
    return { cardSlugs: combo.cardSlugs };
  }

  const templates = await prisma.dailyComboTemplate.findMany({
    orderBy: { order: 'asc' },
  });

  if (templates.length === 0) {
    const fallback = ['alm', 'ice', 'tap'];
    combo = await prisma.dailyCombo.create({
      data: { date: today, cardSlugs: fallback, isOverride: false },
    });
    return { cardSlugs: combo.cardSlugs };
  }

  const startOfYear = new Date(Date.UTC(today.getUTCFullYear(), 0, 0));
  const dayOfYear = Math.floor((today.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
  const index = dayOfYear % templates.length;
  const template = templates[index];
  const slugs = template.cardSlugs.slice(0, 3);
  if (slugs.length < 3) {
    const fallback = ['alm', 'ice', 'tap'];
    combo = await prisma.dailyCombo.create({
      data: { date: today, cardSlugs: fallback.slice(0, 3), isOverride: false },
    });
    return { cardSlugs: combo.cardSlugs };
  }

  combo = await prisma.dailyCombo.create({
    data: { date: today, cardSlugs: slugs, isOverride: false },
  });
  return { cardSlugs: combo.cardSlugs };
}

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
  });

  if (!dbUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const today = getStartOfDayUTC(new Date());
  await getOrCreateTodayCombo();

  const attempt = await prisma.userDailyComboAttempt.findUnique({
    where: {
      userId_date: { userId: dbUser.id, date: today },
    },
  });

  const attemptsLeft = Math.max(0, DAILY_COMBO_MAX_ATTEMPTS - (attempt?.attemptsUsed ?? 0));
  const claimed = !!attempt?.claimedAt;

  const cards = await prisma.comboCard.findMany({
    orderBy: [{ category: 'asc' }, { order: 'asc' }],
    select: { slug: true, label: true, image: true, category: true },
  });

  return NextResponse.json({
    cards,
    attemptsLeft,
    claimed,
    reward: DAILY_COMBO_REWARD,
    date: today.toISOString().split('T')[0],
  });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { initData, selectedSlugs } = body;

  if (!initData || !Array.isArray(selectedSlugs) || selectedSlugs.length !== 3) {
    return NextResponse.json({ error: 'Missing initData or selectedSlugs (array of 3)' }, { status: 400 });
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
  });

  if (!dbUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const today = getStartOfDayUTC(new Date());
  const combo = await getOrCreateTodayCombo();
  const normalized = selectedSlugs.map((s: string) => String(s).trim().toLowerCase());
  const expected = combo.cardSlugs.map((s) => s.toLowerCase());

  const attempt = await prisma.userDailyComboAttempt.upsert({
    where: {
      userId_date: { userId: dbUser.id, date: today },
    },
    create: { userId: dbUser.id, date: today, attemptsUsed: 0 },
    update: {},
  });

  if (attempt.claimedAt) {
    return NextResponse.json({ error: 'Already claimed today', claimed: true }, { status: 400 });
  }

  if (attempt.attemptsUsed >= DAILY_COMBO_MAX_ATTEMPTS) {
    return NextResponse.json({
      error: 'No attempts left for today',
      attemptsLeft: 0,
      success: false,
    }, { status: 400 });
  }

  const correct = normalized.length === expected.length && normalized.every((s, i) => s === expected[i]);

  if (!correct) {
    await prisma.userDailyComboAttempt.update({
      where: { id: attempt.id },
      data: { attemptsUsed: attempt.attemptsUsed + 1 },
    });
    const left = DAILY_COMBO_MAX_ATTEMPTS - attempt.attemptsUsed - 1;
    return NextResponse.json({
      success: false,
      attemptsLeft: left,
      message: left > 0 ? 'Wrong combo. Try again!' : 'No attempts left. Come back tomorrow!',
    }, { status: 200 });
  }

  const updated = await prisma.$transaction(async (tx) => {
    const u = await tx.user.update({
      where: { id: dbUser.id },
      data: {
        points: { increment: DAILY_COMBO_REWARD },
        pointsBalance: { increment: DAILY_COMBO_REWARD },
      },
    });
    await creditWhitePearlsInstant(tx, dbUser.id, DAILY_COMBO_REWARD, 'daily_combo', 'Daily Matrix');
    await tx.userDailyComboAttempt.update({
      where: { id: attempt.id },
      data: { claimedAt: new Date(), attemptsUsed: attempt.attemptsUsed + 1 },
    });
    return u;
  });

  return NextResponse.json({
    success: true,
    claimed: true,
    reward: DAILY_COMBO_REWARD,
    points: updated.points,
    pointsBalance: updated.pointsBalance,
    message: `Correct! +${DAILY_COMBO_REWARD.toLocaleString()} PEARLS`,
  });
}
