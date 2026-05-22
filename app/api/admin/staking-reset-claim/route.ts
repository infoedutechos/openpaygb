/**
 * Admin: Reset stake "claimed" state so the user can claim again.
 * Use for users who see "Already claimed" but never received their staked PEARLS (e.g. stuck during maintenance).
 * POST { stakeId: string } – reset one stake.
 * POST { bulk: true, confirm: "RESET_ALL_CLAIMED" } – reset all stakes that have claimedAt set (one-time recovery).
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { isAdminAuthorized } from '@/utils/admin-session';

export async function POST(req: NextRequest) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { stakeId, bulk, confirm: confirmFlag } = body;

    if (bulk === true) {
      if (confirmFlag !== 'RESET_ALL_CLAIMED') {
        return NextResponse.json(
          { error: 'Bulk reset requires confirm: "RESET_ALL_CLAIMED" in the request body.' },
          { status: 400 }
        );
      }
      const result = await prisma.stake.updateMany({
        where: { claimedAt: { not: null } },
        data: { claimedAt: null },
      });
      return NextResponse.json({
        ok: true,
        message: 'All claimed stakes have been reset. Affected users can claim again (they will receive only their staked amount).',
        resetCount: result.count,
      });
    }

    if (!stakeId || typeof stakeId !== 'string') {
      return NextResponse.json({ error: 'stakeId is required (string)' }, { status: 400 });
    }

    const stake = await prisma.stake.findFirst({
      where: { id: stakeId },
      select: { id: true, userId: true, claimedAt: true, amountLocked: true },
    });

    if (!stake) {
      return NextResponse.json({ error: 'Stake not found' }, { status: 404 });
    }

    if (!stake.claimedAt) {
      return NextResponse.json({ error: 'Stake is not marked as claimed; nothing to reset.' }, { status: 400 });
    }

    await prisma.stake.update({
      where: { id: stakeId },
      data: { claimedAt: null },
    });

    return NextResponse.json({
      ok: true,
      message: 'Claim reset. The user can now claim their staked PEARLS again (staked amount only).',
      stakeId,
      amountLocked: stake.amountLocked,
    });
  } catch (e) {
    console.error('[admin/staking-reset-claim]', e);
    return NextResponse.json({ error: 'Failed to reset claim' }, { status: 500 });
  }
}
