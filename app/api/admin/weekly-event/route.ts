// app/api/admin/weekly-event/route.ts

/**
 * Admin API for Weekly Event (Hybrid - override tiers per week)
 * GET: list overrides
 * POST: set override for a week
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { getWeekKey } from '@/utils/week-utils';
import { getAdminAuthError } from '@/utils/admin-session';

export async function GET(req: NextRequest) {
  const authError = getAdminAuthError(req);
  if (authError) return NextResponse.json(authError.body, { status: authError.status });

  const overrides = await prisma.weeklyEventOverride.findMany({
    orderBy: { weekKey: 'desc' },
    take: 20,
  });

  return NextResponse.json({
    overrides,
    currentWeek: getWeekKey(),
  });
}

export async function POST(req: NextRequest) {
  const authError = getAdminAuthError(req);
  if (authError) return NextResponse.json(authError.body, { status: authError.status });

  const body = await req.json().catch(() => ({}));
  const { weekKey, tiers } = body;

  if (!weekKey || !Array.isArray(tiers) || tiers.length === 0) {
    return NextResponse.json({ error: 'weekKey and tiers array required' }, { status: 400 });
  }

  const validTiers = tiers.every((t: unknown) => {
    if (!t || typeof t !== 'object' || !('taps' in t) || !('tasks' in t) || !('reward' in t)) return false;
    const o = t as { taps: number; tasks: number; reward: number; referrals?: number };
    if (typeof o.taps !== 'number' || typeof o.tasks !== 'number' || typeof o.reward !== 'number') return false;
    if ('referrals' in o && o.referrals !== undefined && typeof o.referrals !== 'number') return false;
    return true;
  });

  if (!validTiers) {
    return NextResponse.json(
      {
        error: 'Each tier must have taps, tasks, reward (numbers); referrals optional (number)',
      },
      { status: 400 }
    );
  }

  const override = await prisma.weeklyEventOverride.upsert({
    where: { weekKey },
    create: { weekKey, tiers },
    update: { tiers },
  });

  return NextResponse.json({ success: true, override });
}
