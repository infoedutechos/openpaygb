/**
 * GET: list global task templates (browseable competitions). No participations; invite-based challenges use GlobalTaskChallenge.
 * If no templates exist, seeds 10 team + 10 league so everyone can browse them.
 */

import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { LEAGUE_TIERS } from '@/utils/consts';
import { GLOBAL_TASK_SEED_TEAM, GLOBAL_TASK_SEED_LEAGUE } from '@/utils/global-tasks-seed-data';

export const dynamic = 'force-dynamic';

function targetLabel(metric: string, targetValue: number): string {
  if (metric === 'taps') return `${targetValue.toLocaleString()} taps`;
  if (metric === 'tiers') return `Tier ${LEAGUE_TIERS[targetValue] ?? targetValue}`;
  if (metric === 'referrals') return `${targetValue} referrals`;
  if (metric === 'tasks') return `${targetValue} tasks`;
  if (metric === 'points') return `${targetValue.toLocaleString()} points`;
  return String(targetValue);
}

async function ensureGlobalTasksSeeded() {
  const count = await prisma.globalTask.count();
  if (count > 0) return;
  for (const t of GLOBAL_TASK_SEED_TEAM) {
    await prisma.globalTask.create({
      data: { ...t, participantType: 'team', managementBonusPercent: 30 },
    });
  }
  for (const t of GLOBAL_TASK_SEED_LEAGUE) {
    await prisma.globalTask.create({
      data: { ...t, participantType: 'league', managementBonusPercent: 30 },
    });
  }
}

export async function GET() {
  await ensureGlobalTasksSeeded();
  const tasks = await prisma.globalTask.findMany({
    orderBy: [{ participantType: 'asc' }, { createdAt: 'asc' }],
  });

  const list = tasks.map((t) => ({
    id: t.id,
    name: t.name,
    participantType: t.participantType,
    metric: t.metric,
    targetValue: t.targetValue,
    targetLabel: targetLabel(t.metric, t.targetValue),
    durationDays: t.durationDays,
    managementBonusPercent: t.managementBonusPercent ?? 30,
  }));

  return NextResponse.json({ tasks: list });
}
