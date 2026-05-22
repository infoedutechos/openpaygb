/** Shared Karibu Daily streak UI helpers (API uses `currentStreakDay` as next reward index 0–9). */

export interface DailyRewardStatus {
  canClaimToday: boolean;
  claimedToday: boolean;
  currentStreakDay: number;
  lastDailyRewardClaimedAt: string | null;
  rewards: number[];
}

/** Number of consecutive days completed in the current 10-day cycle (0–10). */
export function karibuDaysCompleted(status: DailyRewardStatus): number {
  if (status.claimedToday && status.currentStreakDay === 0) return 10;
  if (status.claimedToday) return status.currentStreakDay;
  return status.currentStreakDay;
}

export function getKaribuDayState(
  dayIndex: number,
  status: DailyRewardStatus
): 'claimed' | 'today' | 'future' {
  const completed = karibuDaysCompleted(status);
  if (dayIndex < completed) return 'claimed';
  if (!status.claimedToday && status.canClaimToday && dayIndex === status.currentStreakDay) return 'today';
  return 'future';
}
