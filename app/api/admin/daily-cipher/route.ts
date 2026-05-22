// app/api/admin/daily-cipher/route.ts

/**
 * Admin API for Daily Cipher (Hybrid mode)
 * GET: list ciphers and word pool
 * POST: create/override cipher for a date, or bulk import words
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { getAdminAuthError } from '@/utils/admin-session';

export async function GET(req: NextRequest) {
  const authError = getAdminAuthError(req);
  if (authError) return NextResponse.json(authError.body, { status: authError.status });

  const { searchParams } = new URL(req.url);
  const mode = searchParams.get('mode'); // 'ciphers' | 'words'

  if (mode === 'words') {
    const words = await prisma.cipherWord.findMany({
      orderBy: { order: 'asc' },
    });
    return NextResponse.json({ words });
  }

  // List ciphers (recent + upcoming)
  const ciphers = await prisma.dailyCipher.findMany({
    orderBy: { date: 'desc' },
    take: 60,
  });

  return NextResponse.json({ ciphers });
}

export async function POST(req: NextRequest) {
  const authError = getAdminAuthError(req);
  if (authError) return NextResponse.json(authError.body, { status: authError.status });

  const body = await req.json().catch(() => ({}));
  const { action, date, word, hint, words } = body;

  // Create or override cipher for a date
  if (action === 'setCipher') {
    if (!date || !word || typeof word !== 'string') {
      return NextResponse.json({ error: 'date and word required' }, { status: 400 });
    }

    const cleanWord = word.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!cleanWord) {
      return NextResponse.json({ error: 'Invalid word (letters/numbers only)' }, { status: 400 });
    }

    const d = new Date(date);
    if (isNaN(d.getTime())) {
      return NextResponse.json({ error: 'Invalid date' }, { status: 400 });
    }

    const today = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));

    const cipher = await prisma.dailyCipher.upsert({
      where: { date: today },
      create: {
        date: today,
        word: cleanWord,
        hint: typeof hint === 'string' ? hint : `${cleanWord.length} letters`,
        isOverride: true,
      },
      update: {
        word: cleanWord,
        hint: typeof hint === 'string' ? hint : `${cleanWord.length} letters`,
        isOverride: true,
      },
    });

    return NextResponse.json({ success: true, cipher });
  }

  // Bulk import words for auto-selection pool
  if (action === 'bulkImportWords') {
    const wordList = Array.isArray(words) ? words : (typeof words === 'string' ? words.split(/[\s,]+/) : []);
    const cleanWords = wordList
      .map((w: string) => String(w).toUpperCase().replace(/[^A-Z0-9]/g, ''))
      .filter((w: string) => w.length > 0);

    if (cleanWords.length === 0) {
      return NextResponse.json({ error: 'No valid words provided' }, { status: 400 });
    }

    const maxOrder = await prisma.cipherWord.aggregate({
      _max: { order: true },
    });
    let nextOrder = (maxOrder._max.order ?? -1) + 1;

    const created = await prisma.$transaction(
      cleanWords.map((w: string) =>
        prisma.cipherWord.create({
          data: { word: w, order: nextOrder++ },
        })
      )
    );

    return NextResponse.json({ success: true, imported: created.length });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
