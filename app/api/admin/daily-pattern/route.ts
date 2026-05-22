/**
 * Admin API for Daily Pattern (9-dot pattern lock)
 * GET: today's pattern (for display in admin)
 * POST: set override for today
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuthError } from '@/utils/admin-session';
import { getTodayPattern, setTodayPatternOverride, getDailyPatternEnabled, setDailyPatternEnabled, getTodayPatternReward } from '@/utils/daily-pattern';

export async function GET(req: NextRequest) {
  const authError = getAdminAuthError(req);
  if (authError) return NextResponse.json(authError.body, { status: authError.status });

  try {
    const [pattern, enabled, reward] = await Promise.all([getTodayPattern(), getDailyPatternEnabled(), getTodayPatternReward()]);
    return NextResponse.json({ pattern, patternDisplay: pattern.replace(/-/g, ' → '), enabled, reward });
  } catch (e) {
    console.error('Admin daily-pattern GET error:', e);
    return NextResponse.json({ error: 'Failed to get today\'s pattern' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const authError = getAdminAuthError(req);
  if (authError) return NextResponse.json(authError.body, { status: authError.status });

  const body = await req.json().catch(() => ({}));
  const { action, pattern: patternInput, enabled: enabledValue, reward: rewardInput } = body;

  if (action === 'setEnabled') {
    const enabled = enabledValue === true || enabledValue === 'true';
    await setDailyPatternEnabled(!!enabled);
    return NextResponse.json({ success: true, enabled: !!enabled });
  }

  if (action === 'setOverride') {
    if (!patternInput || typeof patternInput !== 'string') {
      return NextResponse.json({ error: 'pattern required (e.g. "0-1-2-4-6-8-9-10" or comma-separated)' }, { status: 400 });
    }
    const reward = typeof rewardInput === 'number' && rewardInput >= 0 ? rewardInput : (typeof rewardInput === 'string' && rewardInput.trim() !== '' ? parseFloat(rewardInput) : undefined);
    const rewardValue = reward != null && !Number.isNaN(reward) && reward >= 0 ? reward : undefined;
    try {
      await setTodayPatternOverride(patternInput, rewardValue);
      const pattern = await getTodayPattern();
      const finalReward = await getTodayPatternReward();
      return NextResponse.json({ success: true, pattern, patternDisplay: pattern.replace(/-/g, ' → '), reward: finalReward });
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Invalid pattern';
      return NextResponse.json({ error: message }, { status: 400 });
    }
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
