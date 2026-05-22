/**
 * Admin: GET list global task templates + challenges (with progress).
 * POST: seed (20 tasks: 10 team, 10 league), setWinner (challengeId, winnerTeamId | winnerLeagueId), redeem (challengeId). Management 30% in pool; league winner = split among member teams.
 */

import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { isAdminAuthorized } from '@/utils/admin-session';
import { getProgressForTask } from '@/utils/global-tasks';
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

export async function GET(req: Request) {
  if (!isAdminAuthorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

  const [templates, challenges] = await Promise.all([
    prisma.globalTask.findMany({ orderBy: [{ participantType: 'asc' }, { createdAt: 'asc' }] }),
    prisma.globalTaskChallenge.findMany({
      include: { task: true, snapshots: true },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  const challengeList = await Promise.all(
    challenges.map(async (c) => {
      const creatorProgress = await getProgressForTask(prisma, c.task.participantType, c.task.metric, c.creatorTeamId, c.creatorLeagueId);
      const opponentProgress = await getProgressForTask(prisma, c.task.participantType, c.task.metric, c.opponentTeamId, c.opponentLeagueId);
      const creatorSnap = c.snapshots.find((s) => (c.task.participantType === 'team' ? s.teamId === c.creatorTeamId : s.leagueId === c.creatorLeagueId));
      const opponentSnap = c.snapshots.find((s) => (c.task.participantType === 'team' ? s.teamId === c.opponentTeamId : s.leagueId === c.opponentLeagueId));
      let creatorName = '';
      let opponentName = '';
      if (c.creatorTeamId) {
        const t = await prisma.team.findUnique({ where: { id: c.creatorTeamId }, select: { name: true } });
        creatorName = t?.name ?? c.creatorTeamId;
      }
      if (c.creatorLeagueId) {
        const l = await prisma.userCreatedLeague.findUnique({ where: { id: c.creatorLeagueId }, select: { name: true } });
        creatorName = l?.name ?? c.creatorLeagueId;
      }
      if (c.opponentTeamId) {
        const t = await prisma.team.findUnique({ where: { id: c.opponentTeamId }, select: { name: true } });
        opponentName = t?.name ?? c.opponentTeamId;
      }
      if (c.opponentLeagueId) {
        const l = await prisma.userCreatedLeague.findUnique({ where: { id: c.opponentLeagueId }, select: { name: true } });
        opponentName = l?.name ?? c.opponentLeagueId;
      }
      return {
        id: c.id,
        globalTaskId: c.globalTaskId,
        taskName: c.task.name,
        targetLabel: targetLabel(c.task.metric, c.task.targetValue),
        status: c.status,
        creatorName,
        opponentName,
        creatorTeamId: c.creatorTeamId,
        creatorLeagueId: c.creatorLeagueId,
        opponentTeamId: c.opponentTeamId,
        opponentLeagueId: c.opponentLeagueId,
        creatorStake: c.creatorStake,
        opponentStake: c.opponentStake,
        prizePool: c.prizePool,
        managementBonusAmount: c.managementBonusAmount,
        startedAt: c.startedAt?.toISOString() ?? null,
        endsAt: c.endsAt?.toISOString() ?? null,
        winnerTeamId: c.winnerTeamId,
        winnerLeagueId: c.winnerLeagueId,
        redeemedAt: c.redeemedAt?.toISOString() ?? null,
        creatorProgress: creatorSnap ? creatorProgress - creatorSnap.metricValue : creatorProgress,
        opponentProgress: opponentSnap ? opponentProgress - opponentSnap.metricValue : opponentProgress,
      };
    })
  );

  return NextResponse.json({
    templates: templates.map((t) => ({
      id: t.id,
      name: t.name,
      participantType: t.participantType,
      metric: t.metric,
      targetValue: t.targetValue,
      targetLabel: targetLabel(t.metric, t.targetValue),
      durationDays: t.durationDays,
      managementBonusPercent: t.managementBonusPercent ?? 30,
    })),
    challenges: challengeList,
  });
}

export async function POST(req: Request) {
  if (!isAdminAuthorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const { action, challengeId, winnerTeamId, winnerLeagueId } = body;

  if (action === 'seed') {
    const count = await prisma.globalTask.count();
    if (count > 0) return NextResponse.json({ message: 'Templates already exist', count });

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
    const newCount = await prisma.globalTask.count();
    return NextResponse.json({ message: `Created ${newCount} global task templates (10 team, 10 league)`, count: newCount });
  }

  if (action === 'setWinner' && challengeId) {
    const challenge = await prisma.globalTaskChallenge.findUnique({
      where: { id: challengeId },
      include: { task: true },
    });
    if (!challenge) return NextResponse.json({ error: 'Challenge not found' }, { status: 404 });
    if (challenge.status !== 'active') return NextResponse.json({ error: 'Challenge is not active' }, { status: 400 });

    if (winnerTeamId) {
      const isParticipant = challenge.creatorTeamId === winnerTeamId || challenge.opponentTeamId === winnerTeamId;
      if (!isParticipant) return NextResponse.json({ error: 'Team did not participate' }, { status: 400 });
      await prisma.globalTaskChallenge.update({
        where: { id: challengeId },
        data: { status: 'completed', winnerTeamId, winnerLeagueId: null },
      });
    } else if (winnerLeagueId) {
      const isParticipant = challenge.creatorLeagueId === winnerLeagueId || challenge.opponentLeagueId === winnerLeagueId;
      if (!isParticipant) return NextResponse.json({ error: 'League did not participate' }, { status: 400 });
      await prisma.globalTaskChallenge.update({
        where: { id: challengeId },
        data: { status: 'completed', winnerTeamId: null, winnerLeagueId },
      });
    } else {
      return NextResponse.json({ error: 'Provide winnerTeamId or winnerLeagueId' }, { status: 400 });
    }
    return NextResponse.json({ success: true, message: 'Winner set' });
  }

  if (action === 'redeem' && challengeId) {
    const challenge = await prisma.globalTaskChallenge.findUnique({
      where: { id: challengeId },
      include: { task: true },
    });
    if (!challenge) return NextResponse.json({ error: 'Challenge not found' }, { status: 404 });
    if (challenge.status !== 'completed') return NextResponse.json({ error: 'Set winner first' }, { status: 400 });
    if (challenge.redeemedAt) return NextResponse.json({ error: 'Already redeemed' }, { status: 400 });

    const prizePool = challenge.prizePool;

    if (challenge.winnerLeagueId) {
      const league = await prisma.userCreatedLeague.findUnique({
        where: { id: challenge.winnerLeagueId },
        select: { creatorId: true },
      });
      if (!league) return NextResponse.json({ error: 'Winning league not found' }, { status: 404 });
      const teams = await prisma.leagueTeam.findMany({
        where: { leagueId: challenge.winnerLeagueId },
        include: { team: { select: { creatorId: true } } },
      });
      if (teams.length === 0) {
        await prisma.$transaction([
          prisma.user.update({
            where: { id: league.creatorId },
            data: { pointsBalance: { increment: prizePool } },
          }),
          prisma.globalTaskChallenge.update({
            where: { id: challengeId },
            data: { redeemedAt: new Date() },
          }),
        ]);
        return NextResponse.json({ success: true, message: `Paid ${prizePool.toLocaleString()} PEARLS to league creator (no teams in league)` });
      }
      const perTeam = prizePool / teams.length;
      const updates = teams.map((lt) =>
        prisma.user.update({
          where: { id: lt.team.creatorId },
          data: { pointsBalance: { increment: perTeam } },
        })
      );
      await prisma.$transaction([
        ...updates,
        prisma.globalTaskChallenge.update({
          where: { id: challengeId },
          data: { redeemedAt: new Date() },
        }),
      ]);
      return NextResponse.json({ success: true, message: `Paid ${prizePool.toLocaleString()} PEARLS to ${teams.length} teams in winning league` });
    }

    if (challenge.winnerTeamId) {
      const team = await prisma.team.findUnique({ where: { id: challenge.winnerTeamId }, select: { creatorId: true } });
      if (!team) return NextResponse.json({ error: 'Winner team not found' }, { status: 404 });
      await prisma.$transaction([
        prisma.user.update({
          where: { id: team.creatorId },
          data: { pointsBalance: { increment: prizePool } },
        }),
        prisma.globalTaskChallenge.update({
          where: { id: challengeId },
          data: { redeemedAt: new Date() },
        }),
      ]);
      return NextResponse.json({ success: true, message: `Paid ${prizePool.toLocaleString()} PEARLS to winning team creator` });
    }

    return NextResponse.json({ error: 'No winner set' }, { status: 400 });
  }

  return NextResponse.json({ error: 'Unknown action or missing params' }, { status: 400 });
}
