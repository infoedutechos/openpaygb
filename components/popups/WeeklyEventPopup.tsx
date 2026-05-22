// components/popups/WeeklyEventPopup.tsx

/**
 * Weekly Event - multi-tier objectives, leaderboard
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useGameStore } from '@/utils/game-mechanics';
import { formatNumber, triggerHapticFeedback } from '@/utils/ui';
import { notifyPearlBalancesRefresh } from '@/utils/pearl-balance-events';
import { useToast } from '@/contexts/ToastContext';

interface TierConfig {
  taps: number;
  tasks: number;
  reward: number;
  referrals?: number; // new referrals this week only
}

interface LeaderboardEntry {
  rank: number;
  name: string;
  taps: number;
  tasksCompleted: number;
  pointsEarned: number;
}

interface WeeklyEventPopupProps {
  onClose: () => void;
}

export default function WeeklyEventPopup({ onClose }: WeeklyEventPopupProps) {
  const { userTelegramInitData, incrementPoints, setPoints, setPointsBalance } = useGameStore();
  const [weekKey, setWeekKey] = useState('');
  const [tiers, setTiers] = useState<TierConfig[]>([]);
  const [progress, setProgress] = useState<{ taps: number; tasksCompleted: number; pointsEarned: number; referralsThisWeek?: number; claimedTiers: boolean[] }>({ taps: 0, tasksCompleted: 0, pointsEarned: 0, claimedTiers: [] });
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [claimingTier, setClaimingTier] = useState<number | null>(null);
  const showToast = useToast();

  const fetchData = useCallback(async () => {
    try {
      const url = userTelegramInitData
        ? `/api/weekly-event?initData=${encodeURIComponent(userTelegramInitData)}`
        : '/api/weekly-event';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setWeekKey(data.weekKey ?? '');
        setTiers(data.tiers ?? []);
        setProgress(data.progress ?? { taps: 0, tasksCompleted: 0, pointsEarned: 0, referralsThisWeek: 0, claimedTiers: [] });
        setLeaderboard(data.leaderboard ?? []);
        setMyRank(data.myRank ?? null);
      }
    } catch {
      setTiers([]);
    } finally {
      setIsLoading(false);
    }
  }, [userTelegramInitData]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleClaim = async (tier: number) => {
    if (!userTelegramInitData || claimingTier) return;
    setClaimingTier(tier);
    triggerHapticFeedback(window);
    try {
      const res = await fetch('/api/weekly-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData: userTelegramInitData, action: 'claim', tier }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Claim failed');
      incrementPoints(data.reward);
      if (data.points != null) setPoints(data.points);
      if (data.pointsBalance != null) setPointsBalance(data.pointsBalance);
      showToast(`+${formatNumber(data.reward)} PEARLS!`, 'success');
      notifyPearlBalancesRefresh();
      fetchData();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Claim failed', 'error');
    } finally {
      setClaimingTier(null);
    }
  };

  const handleClose = () => {
    triggerHapticFeedback(window);
    onClose();
  };

  const getTierClaimed = (i: number) => progress.claimedTiers?.[i - 1] ?? false;

  const referralsThisWeek = progress.referralsThisWeek ?? 0;
  const getTierUnlocked = (t: TierConfig) =>
    progress.taps >= t.taps &&
    progress.tasksCompleted >= t.tasks &&
    (t.referrals == null || t.referrals <= 0 || referralsThisWeek >= t.referrals);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ura-navy/60 p-0 sm:items-center sm:p-4">
      <div className="max-h-[90dvh] w-full max-w-xl flex flex-col overflow-hidden animate-slide-up rounded-t-3xl bg-ura-panel sm:rounded-2xl">
        <div className="px-5 pt-6 pb-4 flex justify-between items-start flex-shrink-0">
          <div>
            <h2 className="text-xl font-bold text-white">Weekly Challenge</h2>
            <p className="text-sm text-gray-400">{weekKey || 'This week'}</p>
          </div>
          <button onClick={handleClose} className="text-gray-400 hover:text-white text-2xl w-8 h-8">&times;</button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-8">
          {isLoading ? (
            <p className="text-center text-gray-400 py-8">Loading...</p>
          ) : (
            <>
              <div className="bg-ura-panel-2 rounded-xl p-4 mb-4">
                <p className="text-gray-400 text-sm">Your progress (this week only)</p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                  <span>{formatNumber(progress.taps)} taps</span>
                  <span>{progress.tasksCompleted} tasks</span>
                  <span>{referralsThisWeek} new referrals</span>
                  <span>{formatNumber(Math.floor(progress.pointsEarned))} PEARLS earned</span>
                </div>
                <p className="text-xs text-gray-500 mt-2">Referrals = users who joined this week via your link (existing referrals don’t count)</p>
              </div>

              <h3 className="text-base font-bold text-white mb-3">Tiers</h3>
              <div className="space-y-2 mb-6">
                {tiers.map((t, i) => {
                  const tierNum = i + 1;
                  const refsRequired = tierNum === 1 ? 1 : (t.referrals ?? Math.min(tierNum, 16));
                  const claimed = getTierClaimed(tierNum);
                  const unlocked = getTierUnlocked({ ...t, referrals: refsRequired });
                  return (
                    <div
                      key={i}
                      className={`rounded-xl p-4 flex justify-between items-center ${
                        claimed ? 'bg-emerald-500/20 border border-emerald-500/40' : unlocked ? 'bg-ura-gold/20 border border-[#f3ba2f]/40' : 'bg-ura-panel-2'
                      }`}
                    >
                      <div>
                        <p className="font-bold text-white">Tier {tierNum}</p>
                        <p className="text-sm text-gray-400">
                          {t.taps.toLocaleString()} taps + {t.tasks} tasks
                          {refsRequired > 0 && <> + {refsRequired} new refs</>}
                          {' → '}<span className="text-[#f3ba2f]">{formatNumber(t.reward)} PEARLS</span>
                        </p>
                      </div>
                      <div>
                        {claimed ? (
                          <span className="text-emerald-400 font-bold">Claimed</span>
                        ) : unlocked ? (
                          <button
                            onClick={() => handleClaim(tierNum)}
                            disabled={claimingTier === tierNum}
                            className="px-4 py-2 rounded-lg bg-ura-gold text-black font-bold text-sm disabled:opacity-50"
                          >
                            {claimingTier === tierNum ? '...' : 'Claim'}
                          </button>
                        ) : (
                          <span className="text-gray-500 text-sm text-right">
                            {Math.max(0, t.taps - progress.taps).toLocaleString()} taps, {Math.max(0, t.tasks - progress.tasksCompleted)} tasks
                            {refsRequired > 0 && <>, {Math.max(0, refsRequired - referralsThisWeek)} refs</>}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <h3 className="text-base font-bold text-white mb-3">Leaderboard</h3>
              {myRank != null && (
                <p className="text-[#f3ba2f] text-sm mb-2">Your rank: #{myRank}</p>
              )}
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {leaderboard.map((e) => (
                  <div key={e.rank} className="flex justify-between items-center py-2 px-3 rounded-lg bg-ura-panel-2">
                    <span className="font-bold w-8">#{e.rank}</span>
                    <span className="flex-1 truncate mx-2">{e.name || 'Anonymous'}</span>
                    <span className="text-[#f3ba2f] text-sm">{formatNumber(e.taps)} taps</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
