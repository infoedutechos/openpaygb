/**
 * GET: list challenges for current user (pending invites to accept, active, completed).
 * Query: initData (required)
 */

import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { validateTelegramWebAppData } from '@/utils/server-checks';
import { getProgressForTask } from '@/utils/global-tasks';
import { LEAGUE_TIERS } from '@/utils/consts';

function targetLabel(metric: string, targetValue: number): string {
  if (metric === 'taps') return `${targetValue.toLocaleString()} taps`;
  if (metric === 'tiers') return `Tier ${LEAGUE_TIERS[targetValue] ?? targetValue}`;
  if (metric === 'referrals') return `${targetValue} referrals`;
  if (metric === 'tasks') return `${targetValue} tasks`;
  if (metric === 'points') return `${targetValue.toLocaleString()} points`;
  return String(targetValue);
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const initData = searchParams.get('initData');
  if (!initData) return NextResponse.json({ error: 'Missing initData' }, { status: 400 });

  const { user } = validateTelegramWebAppData(initData);
  if (!user) return NextResponse.json({ error: 'Invalid Telegram data' }, { status: 403 });
  const telegramId = user.id?.toString();
  if (!telegramId) return NextResponse.json({ error: 'Invalid user' }, { status: 400 });

  const dbUser = await prisma.user.findUnique({ where: { telegramId } });
  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const myTeamIds = await prisma.team.findMany({ where: { creatorId: dbUser.id }, select: { id: true } }).then((t) => t.map((x) => x.id));
  const myLeagueIds = await prisma.userCreatedLeague.findMany({ where: { creatorId: dbUser.id }, select: { id: true } }).then((l) => l.map((x) => x.id));

  const challenges = await prisma.globalTaskChallenge.findMany({
    where: {
      OR: [
        { creatorTeamId: { in: myTeamIds } },
        { creatorLeagueId: { in: myLeagueIds } },
        { opponentTeamId: { in: myTeamIds } },
        { opponentLeagueId: { in: myLeagueIds } },
      ],
    },
    include: { task: true, snapshots: true },
    orderBy: { createdAt: 'desc' },
  });

  const list = await Promise.all(
    challenges.map(async (c) => {
      const creatorProgress = await getProgressForTask(prisma, c.task.participantType, c.task.metric, c.creatorTeamId, c.creatorLeagueId);
      const opponentProgress = await getProgressForTask(prisma, c.task.participantType, c.task.metric, c.opponentTeamId, c.opponentLeagueId);
      const creatorSnapshot = c.snapshots.find((s) => (c.task.participantType === 'team' ? s.teamId === c.creatorTeamId : s.leagueId === c.creatorLeagueId));
      const opponentSnapshot = c.snapshots.find((s) => (c.task.participantType === 'team' ? s.teamId === c.opponentTeamId : s.leagueId === c.opponentLeagueId));
      const creatorNet = creatorSnapshot ? creatorProgress - creatorSnapshot.metricValue : creatorProgress;
      const opponentNet = opponentSnapshot ? opponentProgress - opponentSnapshot.metricValue : opponentProgress;

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

      const isMineCreator = (c.task.participantType === 'team' && myTeamIds.includes(c.creatorTeamId!)) || (c.task.participantType === 'league' && myLeagueIds.includes(c.creatorLeagueId!));
      const isMineOpponent = (c.task.participantType === 'team' && myTeamIds.includes(c.opponentTeamId!)) || (c.task.participantType === 'league' && myLeagueIds.includes(c.opponentLeagueId!));
      const canAccept = c.status === 'pending' && isMineOpponent;

      return {
        id: c.id,
        globalTaskId: c.globalTaskId,
        taskName: c.task.name,
        targetLabel: targetLabel(c.task.metric, c.task.targetValue),
        status: c.status,
        creatorName,
        opponentName,
        creatorTeamId: c.creatorTeamId,
        opponentTeamId: c.opponentTeamId,
        creatorLeagueId: c.creatorLeagueId,
        opponentLeagueId: c.opponentLeagueId,
        creatorStake: c.creatorStake,
        opponentStake: c.opponentStake,
        prizePool: c.prizePool,
        managementBonusAmount: c.managementBonusAmount,
        startedAt: c.startedAt?.toISOString() ?? null,
        endsAt: c.endsAt?.toISOString() ?? null,
        winnerTeamId: c.winnerTeamId,
        winnerLeagueId: c.winnerLeagueId,
        creatorProgress: creatorNet,
        opponentProgress: opponentNet,
        isMineCreator,
        isMineOpponent,
        canAccept,
      };
    })
  );

  return NextResponse.json({ challenges: list });
}