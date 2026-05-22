// app/api/daily-cipher/route.ts

/**
 * Daily Cipher - Morse code puzzle of the day (Hybrid mode)
 * GET: status (hint, attemptsLeft, claimed)
 * POST: claim (submit pattern, validate, grant reward)
 */

import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { validateTelegramWebAppData } from '@/utils/server-checks';
import { DAILY_CIPHER_MAX_ATTEMPTS, DAILY_CIPHER_REWARD } from '@/utils/consts';
import { morseToWord, normalizeMorseInput } from '@/utils/morse';
import { creditWhitePearlsInstant } from '@/utils/pearls';

function getStartOfDayUTC(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

async function getOrCreateTodayCipher(): Promise<{ word: string; hint: string | null; isOverride: boolean }> {
  const now = new Date();
  const today = getStartOfDayUTC(now);

  // 1. Check for override or existing cipher for today
  let cipher = await prisma.dailyCipher.findUnique({
    where: { date: today },
  });

  if (cipher) {
    return { word: cipher.word, hint: cipher.hint, isOverride: cipher.isOverride };
  }

  // 2. Auto-generate from word list (Hybrid mode)
  const words = await prisma.cipherWord.findMany({
    orderBy: { order: 'asc' },
  });

  if (words.length === 0) {
    // Fallback: use default word if no words in pool
    cipher = await prisma.dailyCipher.create({
      data: {
        date: today,
        word: 'PEARLS',
        hint: '3 letters, your token',
        isOverride: false,
      },
    });
    return { word: cipher.word, hint: cipher.hint, isOverride: cipher.isOverride };
  }

  // Pick word by day-of-year % count for deterministic daily rotation
  const startOfYear = new Date(Date.UTC(today.getUTCFullYear(), 0, 0));
  const dayOfYear = Math.floor((today.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
  const index = dayOfYear % words.length;
  const word = words[index];

  cipher = await prisma.dailyCipher.create({
    data: {
      date: today,
      word: word.word,
      hint: `${word.word.length} letters`,
      isOverride: false,
    },
  });

  return { word: cipher.word, hint: cipher.hint, isOverride: cipher.isOverride };
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

  const cipher = await getOrCreateTodayCipher();

  const attempt = await prisma.userDailyCipherAttempt.findUnique({
    where: {
      userId_date: { userId: dbUser.id, date: today },
    },
  });

  const attemptsLeft = Math.max(0, DAILY_CIPHER_MAX_ATTEMPTS - (attempt?.attemptsUsed ?? 0));
  const claimed = !!attempt?.claimedAt;

  return NextResponse.json({
    hint: cipher.hint ?? `${cipher.word.length} letters`,
    attemptsLeft,
    claimed,
    date: today.toISOString().split('T')[0],
    reward: DAILY_CIPHER_REWARD,
  });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { initData, pattern } = body;

  if (!initData || typeof pattern !== 'string') {
    return NextResponse.json({ error: 'Missing initData or pattern' }, { status: 400 });
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
  const cipher = await getOrCreateTodayCipher();

  const attempt = await prisma.userDailyCipherAttempt.upsert({
    where: {
      userId_date: { userId: dbUser.id, date: today },
    },
    create: {
      userId: dbUser.id,
      date: today,
      attemptsUsed: 0,
    },
    update: {},
  });

  if (attempt.claimedAt) {
    return NextResponse.json({ error: 'Already claimed today', claimed: true }, { status: 400 });
  }

  if (attempt.attemptsUsed >= DAILY_CIPHER_MAX_ATTEMPTS) {
    return NextResponse.json({
      error: 'No attempts left for today',
      attemptsLeft: 0,
      success: false,
    }, { status: 400 });
  }

  const normalized = normalizeMorseInput(pattern);
  const decoded = morseToWord(normalized);
  const correct = decoded.toUpperCase() === cipher.word.toUpperCase();

  if (!correct) {
    await prisma.userDailyCipherAttempt.update({
      where: { id: attempt.id },
      data: { attemptsUsed: attempt.attemptsUsed + 1 },
    });

    const attemptsLeft = DAILY_CIPHER_MAX_ATTEMPTS - attempt.attemptsUsed - 1;
    return NextResponse.json({
      success: false,
      attemptsLeft,
      message: attemptsLeft > 0 ? 'Wrong code. Try again!' : 'No attempts left. Come back tomorrow!',
    }, { status: 200 });
  }

  // Correct! Grant reward and mark claimed
  const updated = await prisma.$transaction(async (tx) => {
    const u = await tx.user.update({
      where: { id: dbUser.id },
      data: {
        points: { increment: DAILY_CIPHER_REWARD },
        pointsBalance: { increment: DAILY_CIPHER_REWARD },
      },
    });
    await creditWhitePearlsInstant(tx, dbUser.id, DAILY_CIPHER_REWARD, 'daily_cipher', 'Daily Cipher');
    await tx.userDailyCipherAttempt.update({
      where: { id: attempt.id },
      data: { claimedAt: new Date(), attemptsUsed: attempt.attemptsUsed + 1 },
    });
    return u;
  });

  return NextResponse.json({
    success: true,
    claimed: true,
    reward: DAILY_CIPHER_REWARD,
    points: updated.points,
    pointsBalance: updated.pointsBalance,
    message: `Correct! +${DAILY_CIPHER_REWARD.toLocaleString()} PEARLS`,
  });
}
