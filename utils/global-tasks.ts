/**
 * Progress helpers for global joinable tasks (taps, tiers, invites).
 * LEAGUE_TIERS index: Bronze=0, Silver=1, Gold=2, Platinum=3, Diamond=4, Legend=5.
 */

import type { PrismaClient } from '@prisma/client';
import { LEAGUE_TIERS } from './consts';

type Prisma = PrismaClient;

function tierToIndex(tier: string | null): number {
  if (!tier) return 0;
  const i = LEAGUE_TIERS.indexOf(tier as (typeof LEAGUE_TIERS)[number]);
  return i >= 0 ? i : 0;
}

export async function getTeamTaps(prisma: Prisma, teamId: string): Promise<number> {
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    include: { creator: { select: { totalTaps: true } }, members: { include: { user: { select: { totalTaps: true } } } } },
  });
  if (!team) return 0;
  const creatorTaps = team.creator?.totalTaps ?? 0;
  const memberTaps = team.members.reduce((s, m) => s + (m.user?.totalTaps ?? 0), 0);
  return creatorTaps + memberTaps;
}

export async function getTeamTierMax(prisma: Prisma, teamId: string): Promise<number> {
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    include: { creator: { select: { leagueTier: true } }, members: { include: { user: { select: { leagueTier: true } } } } },
  });
  if (!team) return 0;
  let max = tierToIndex(team.creator?.leagueTier ?? null);
  for (const m of team.members) {
    const t = tierToIndex(m.user?.leagueTier ?? null);
    if (t > max) max = t;
  }
  return max;
}

export async function getTeamReferrals(prisma: Prisma, teamId: string): Promise<number> {
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    include: { creator: { select: { id: true } }, members: { select: { userId: true } } },
  });
  if (!team) return 0;
  const userIds = [team.creator.id, ...team.members.map((m) => m.userId)];
  return prisma.user.count({
    where: { referredById: { in: userIds } },
  });
}

/** Completed tasks count (UserTask where isCompleted) for team members */
export async function getTeamTasks(prisma: Prisma, teamId: string): Promise<number> {
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    include: { creator: { select: { id: true } }, members: { select: { userId: true } } },
  });
  if (!team) return 0;
  const userIds = [team.creator.id, ...team.members.map((m) => m.userId)];
  const result = await prisma.userTask.aggregate({
    where: { userId: { in: userIds }, isCompleted: true },
    _count: true,
  });
  return result._count;
}

/** Sum of pointsBalance for team members */
export async function getTeamPoints(prisma: Prisma, teamId: string): Promise<number> {
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    include: { creator: { select: { pointsBalance: true } }, members: { include: { user: { select: { pointsBalance: true } } } } },
  });
  if (!team) return 0;
  let sum = (team.creator?.pointsBalance ?? 0) || 0;
  for (let i = 0; i < team.members.length; i++) {
    sum += (team.members[i].user?.pointsBalance ?? 0) || 0;
  }
  return Math.floor(sum);
}

export async function getLeagueTaps(prisma: Prisma, leagueId: string): Promise<number> {
  const league = await prisma.userCreatedLeague.findUnique({
    where: { id: leagueId },
    include: {
      creator: { select: { totalTaps: true } },
      members: { include: { user: { select: { totalTaps: true } } } },
      teams: {
        include: {
          team: {
            include: {
              creator: { select: { totalTaps: true } },
              members: { include: { user: { select: { totalTaps: true } } } },
            },
          },
        },
      },
    },
  });
  if (!league) return 0;
  const creatorTaps = league.creator ? (league.creator.totalTaps ?? 0) : 0;
  const membersTaps = league.members.reduce((s, m) => {
    const ut = m.user ? (m.user.totalTaps ?? 0) : 0;
    return s + ut;
  }, 0);
  let total = creatorTaps + membersTaps;
  const teamsList = league.teams || [];
  for (let i = 0; i < teamsList.length; i++) {
    const lt = teamsList[i];
    const t = lt.team;
    if (!t) continue;
    total += t.creator ? (t.creator.totalTaps ?? 0) : 0;
    for (let j = 0; j < t.members.length; j++) {
      total += t.members[j].user ? (t.members[j].user.totalTaps ?? 0) : 0;
    }
  }
  return total;
}

export async function getLeagueTierMax(prisma: Prisma, leagueId: string): Promise<number> {
  const league = await prisma.userCreatedLeague.findUnique({
    where: { id: leagueId },
    include: {
      creator: { select: { leagueTier: true } },
      members: { include: { user: { select: { leagueTier: true } } } },
      teams: {
        include: {
          team: {
            include: {
              creator: { select: { leagueTier: true } },
              members: { include: { user: { select: { leagueTier: true } } } },
            },
          },
        },
      },
    },
  });
  if (!league) return 0;
  let max = tierToIndex(league.creator ? league.creator.leagueTier : null);
  for (let i = 0; i < league.members.length; i++) {
    const tier = league.members[i].user ? league.members[i].user.leagueTier : null;
    max = Math.max(max, tierToIndex(tier));
  }
  const teamsListTier = league.teams || [];
  for (let i = 0; i < teamsListTier.length; i++) {
    const t = teamsListTier[i].team;
    if (!t) continue;
    max = Math.max(max, tierToIndex(t.creator ? t.creator.leagueTier : null));
    for (let j = 0; j < t.members.length; j++) {
      const tier = t.members[j].user ? t.members[j].user.leagueTier : null;
      max = Math.max(max, tierToIndex(tier));
    }
  }
  return max;
}

/** Completed tasks count for all league members (direct + teams) */
export async function getLeagueTasks(prisma: Prisma, leagueId: string): Promise<number> {
  const league = await prisma.userCreatedLeague.findUnique({
    where: { id: leagueId },
    include: {
      creator: { select: { id: true } },
      members: { select: { userId: true } },
      teams: { include: { team: { include: { creator: { select: { id: true } }, members: { select: { userId: true } } } } } },
    },
  });
  if (!league) return 0;
  const userIds = new Set<string>([league.creator.id, ...league.members.map((m) => m.userId)]);
  const teamsList = league.teams || [];
  for (let i = 0; i < teamsList.length; i++) {
    const t = teamsList[i].team;
    if (!t) continue;
    userIds.add(t.creatorId);
    for (let j = 0; j < t.members.length; j++) userIds.add(t.members[j].userId);
  }
  const result = await prisma.userTask.aggregate({
    where: { userId: { in: Array.from(userIds) }, isCompleted: true },
    _count: true,
  });
  return result._count;
}

/** Sum of pointsBalance for all league members */
export async function getLeaguePoints(prisma: Prisma, leagueId: string): Promise<number> {
  const league = await prisma.userCreatedLeague.findUnique({
    where: { id: leagueId },
    include: {
      creator: { select: { pointsBalance: true } },
      members: { include: { user: { select: { pointsBalance: true } } } },
      teams: {
        include: {
          team: {
            include: {
              creator: { select: { pointsBalance: true } },
              members: { include: { user: { select: { pointsBalance: true } } } },
            },
          },
        },
      },
    },
  });
  if (!league) return 0;
  let sum = (league.creator?.pointsBalance ?? 0) || 0;
  for (let i = 0; i < league.members.length; i++) {
    sum += (league.members[i].user?.pointsBalance ?? 0) || 0;
  }
  const teamsList = league.teams || [];
  for (let i = 0; i < teamsList.length; i++) {
    const t = teamsList[i].team;
    if (!t) continue;
    sum += (t.creator?.pointsBalance ?? 0) || 0;
    for (let j = 0; j < t.members.length; j++) {
      sum += (t.members[j].user?.pointsBalance ?? 0) || 0;
    }
  }
  return Math.floor(sum);
}

export async function getLeagueReferrals(prisma: Prisma, leagueId: string): Promise<number> {
  const league = await prisma.userCreatedLeague.findUnique({
    where: { id: leagueId },
    include: {
      creator: { select: { id: true } },
      members: { select: { userId: true } },
      teams: {
        include: {
          team: {
            include: {
              creator: { select: { id: true } },
              members: { select: { userId: true } },
            },
          },
        },
      },
    },
  });
  if (!league) return 0;
  const userIds = new Set<string>([league.creator.id, ...league.members.map((m) => m.userId)]);
  const teamsList = league.teams || [];
  for (let i = 0; i < teamsList.length; i++) {
    const t = teamsList[i].team;
    if (!t) continue;
    userIds.add(t.creatorId);
    for (let j = 0; j < t.members.length; j++) {
      userIds.add(t.members[j].userId);
    }
  }
  const count = await prisma.user.count({
    where: { referredById: { in: Array.from(userIds) } },
  });
  return count;
}

export async function getProgressForTask(
  prisma: Prisma,
  participantType: string,
  metric: string,
  teamId: string | null,
  leagueId: string | null
): Promise<number> {
  if (participantType === 'team' && teamId) {
    if (metric === 'taps') return getTeamTaps(prisma, teamId);
    if (metric === 'tiers') return getTeamTierMax(prisma, teamId);
    if (metric === 'referrals' || metric === 'invites') return getTeamReferrals(prisma, teamId);
    if (metric === 'tasks') return getTeamTasks(prisma, teamId);
    if (metric === 'points') return getTeamPoints(prisma, teamId);
  }
  if (participantType === 'league' && leagueId) {
    if (metric === 'taps') return getLeagueTaps(prisma, leagueId);
    if (metric === 'tiers') return getLeagueTierMax(prisma, leagueId);
    if (metric === 'referrals' || metric === 'invites') return getLeagueReferrals(prisma, leagueId);
    if (metric === 'tasks') return getLeagueTasks(prisma, leagueId);
    if (metric === 'points') return getLeaguePoints(prisma, leagueId);
  }
  return 0;
}
