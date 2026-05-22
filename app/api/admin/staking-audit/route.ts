/**
 * Admin: Staking audit – report stakes with wrong bonusPercent and optionally correct them.
 * GET: report only (list of stakes where stored bonus != canonical for duration).
 * POST { "action": "correct" }: set every stake's bonusPercent to canonical value for its duration.
 */

import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { getAdminAuthError } from '@/utils/admin-session';
import { STAKING_DURATIONS } from '@/utils/consts';

export const dynamic = 'force-dynamic';

function getExpectedBonusPercent(durationId: string): number {
  const config = STAKING_DURATIONS.find((d) => d.id === durationId);
  return config ? config.bonusPercent : 0;
}

export async function GET(req: Request) {
  const authError = getAdminAuthError(req);
  if (authError) return NextResponse.json(authError.body, { status: authError.status });
  try {
    const stakes = await prisma.stake.findMany({
      include: { user: { select: { telegramId: true, name: true } } },
      orderBy: { lockedAt: 'desc' },
    });
    const report: Array<{
      stakeId: string;
      userId: string;
      telegramId: string;
      name: string | null;
      amountLocked: number;
      duration: string;
      storedBonusPercent: number;
      expectedBonusPercent: number;
      claimedAt: string | null;
      wrongTotalIfClaimed: number;
      correctTotalReturn: number;
    }> = [];
    const allStakesList: Array<{
      stakeId: string;
      userId: string;
      telegramId: string;
      name: string | null;
      amountLocked: number;
      duration: string;
      bonusPercent: number;
      bonusAmount: number;
      totalReturn: number;
      lockedAt: string;
      unlocksAt: string;
      claimedAt: string | null;
      isWrongBonus: boolean;
    }> = [];

    for (const s of stakes) {
      const expected = getExpectedBonusPercent(s.duration);
      const bonusAmount = Math.floor((s.amountLocked * expected) / 100);
      const totalReturn = s.amountLocked + bonusAmount;
      const isWrong = s.bonusPercent !== expected;

      allStakesList.push({
        stakeId: s.id,
        userId: s.userId,
        telegramId: s.user.telegramId,
        name: s.user.name,
        amountLocked: s.amountLocked,
        duration: s.duration,
        bonusPercent: expected,
        bonusAmount,
        totalReturn,
        lockedAt: s.lockedAt.toISOString(),
        unlocksAt: s.unlocksAt.toISOString(),
        claimedAt: s.claimedAt?.toISOString() ?? null,
        isWrongBonus: isWrong,
      });

      if (isWrong) {
        const wrongBonus = Math.floor((s.amountLocked * s.bonusPercent) / 100);
        const correctBonus = Math.floor((s.amountLocked * expected) / 100);
        report.push({
          stakeId: s.id,
          userId: s.userId,
          telegramId: s.user.telegramId,
          name: s.user.name,
          amountLocked: s.amountLocked,
          duration: s.duration,
          storedBonusPercent: s.bonusPercent,
          expectedBonusPercent: expected,
          claimedAt: s.claimedAt?.toISOString() ?? null,
          wrongTotalIfClaimed: s.amountLocked + wrongBonus,
          correctTotalReturn: s.amountLocked + correctBonus,
        });
      }
    }
    const activeStakesList = allStakesList.filter((s) => s.claimedAt == null);
    return NextResponse.json({
      summary: {
        totalStakes: stakes.length,
        activeStakes: activeStakesList.length,
        abnormalCount: report.length,
      },
      allStakes: allStakesList,
      activeStakes: activeStakesList,
      report,
    });
  } catch (e) {
    console.error('[admin/staking-audit]', e);
    return NextResponse.json({ error: 'Failed to run audit' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const authError = getAdminAuthError(req);
  if (authError) return NextResponse.json(authError.body, { status: authError.status });
  try {
    const body = await req.json().catch(() => ({}));
    if ((body as { action?: string }).action !== 'correct') {
      return NextResponse.json({ error: 'Use action: "correct"' }, { status: 400 });
    }
    const stakes = await prisma.stake.findMany({ select: { id: true, duration: true, bonusPercent: true } });
    const knownDurationIds = new Set<string>(STAKING_DURATIONS.map((d) => d.id));
    let updated = 0;
    for (const s of stakes) {
      if (!knownDurationIds.has(s.duration)) continue;
      const expected = getExpectedBonusPercent(s.duration);
      if (s.bonusPercent === expected) continue;
      await prisma.stake.update({
        where: { id: s.id },
        data: { bonusPercent: expected },
      });
      updated += 1;
    }
    return NextResponse.json({ ok: true, updated });
  } catch (e) {
    console.error('[admin/staking-audit]', e);
    return NextResponse.json({ error: 'Failed to correct' }, { status: 500 });
  }
}
