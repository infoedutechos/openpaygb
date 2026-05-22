/**
 * Global task template seed data: 10 team + 10 league. Used by Prisma seed and by GET /api/global-tasks (ensure-seed).
 */

export const GLOBAL_TASK_SEED_TEAM: Array<{
  name: string;
  metric: string;
  targetValue: number;
  durationDays: number;
}> = [
  { name: 'First to 50K Taps (Team)', metric: 'taps', targetValue: 50_000, durationDays: 7 },
  { name: 'First to 100K Taps (Team)', metric: 'taps', targetValue: 100_000, durationDays: 10 },
  { name: 'First to 10 Referrals (Team)', metric: 'referrals', targetValue: 10, durationDays: 7 },
  { name: 'First to 25 Referrals (Team)', metric: 'referrals', targetValue: 25, durationDays: 14 },
  { name: 'First to Silver Tier (Team)', metric: 'tiers', targetValue: 1, durationDays: 7 },
  { name: 'First to Gold Tier (Team)', metric: 'tiers', targetValue: 2, durationDays: 14 },
  { name: 'First to 100 Tasks (Team)', metric: 'tasks', targetValue: 100, durationDays: 10 },
  { name: 'First to 500 Tasks (Team)', metric: 'tasks', targetValue: 500, durationDays: 14 },
  { name: 'First to 1M Points (Team)', metric: 'points', targetValue: 1_000_000, durationDays: 7 },
  { name: 'First to 5M Points (Team)', metric: 'points', targetValue: 5_000_000, durationDays: 14 },
];

export const GLOBAL_TASK_SEED_LEAGUE: Array<{
  name: string;
  metric: string;
  targetValue: number;
  durationDays: number;
}> = [
  { name: 'First to 1000 Referrals (League)', metric: 'referrals', targetValue: 1000, durationDays: 20 },
  { name: 'First to 100M Points (League)', metric: 'points', targetValue: 100_000_000, durationDays: 20 },
  { name: 'First to Legend Tier (League)', metric: 'tiers', targetValue: 5, durationDays: 20 },
  { name: 'First to 10K Tasks (League)', metric: 'tasks', targetValue: 10_000, durationDays: 20 },
  { name: 'First to 500K Taps (League)', metric: 'taps', targetValue: 500_000, durationDays: 14 },
  { name: 'First to 50 Referrals (League)', metric: 'referrals', targetValue: 50, durationDays: 14 },
  { name: 'First to 50M Points (League)', metric: 'points', targetValue: 50_000_000, durationDays: 20 },
  { name: 'First to Diamond Tier (League)', metric: 'tiers', targetValue: 4, durationDays: 14 },
  { name: 'First to 5K Tasks (League)', metric: 'tasks', targetValue: 5_000, durationDays: 20 },
  { name: 'First to 1M Taps (League)', metric: 'taps', targetValue: 1_000_000, durationDays: 20 },
];
