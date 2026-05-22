/**
 * Global donors leaderboard – list all users who have donated, sorted by total donated (desc).
 * Built from CharityDonation records so every donor is included. GET: ?initData=...
 */

import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { validateTelegramWebAppData } from '@/utils/server-checks';

export const dynamic = 'force-dynamic';

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
  try {
    const donations = await prisma.charityDonation.findMany({
      include: { user: { select: { name: true } } },
    });
    const byUser = new Map<string, { name: string; total: number }>();
    for (const d of donations) {
      const id = d.userId;
      const current = byUser.get(id);
      const amount = Math.floor(Number(d.amount) || 0);
      const name = d.user?.name ?? 'Anonymous';
      if (current) {
        current.total += amount;
      } else {
        byUser.set(id, { name, total: amount });
      }
    }
    const list = Array.from(byUser.values())
      .filter((u) => u.total > 0)
      .sort((a, b) => b.total - a.total)
      .map((u) => ({ name: u.name, totalDonatedPoints: u.total }));
    const res = NextResponse.json({ donors: list });
    res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    return res;
  } catch (e) {
    console.error('[donations/leaderboard]', e);
    return NextResponse.json({ error: 'Failed to load' }, { status: 500 });
  }
}
