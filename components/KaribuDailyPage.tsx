'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import IceCube from '@/icons/IceCube';
import { useGameStore } from '@/utils/game-mechanics';
import { formatNumber, triggerHapticFeedback } from '@/utils/ui';
import { useToast } from '@/contexts/ToastContext';
import { pearlWhite } from '@/images';
import { notifyPearlBalancesRefresh } from '@/utils/pearl-balance-events';
import type { DailyRewardStatus } from '@/utils/karibu-daily-ui';
import { getKaribuDayState } from '@/utils/karibu-daily-ui';
import { consumeKaribuDailyBack } from '@/utils/karibu-navigation';

interface KaribuDailyPageProps {
  setCurrentView: (view: string) => void;
}

export default function KaribuDailyPage({ setCurrentView }: KaribuDailyPageProps) {
  const { userTelegramInitData, incrementPoints, setPoints, setPointsBalance } = useGameStore();
  const [status, setStatus] = useState<DailyRewardStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isClaiming, setIsClaiming] = useState(false);
  const showToast = useToast();

  const fetchStatus = useCallback(async () => {
    if (!userTelegramInitData) return;
    try {
      const res = await fetch(
        `/api/daily-reward?initData=${encodeURIComponent(userTelegramInitData)}`
      );
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      setStatus(data);
    } catch {
      setStatus(null);
    } finally {
      setIsLoading(false);
    }
  }, [userTelegramInitData]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onRefresh = () => {
      void fetchStatus();
    };
    window.addEventListener('karibu-daily-status-changed', onRefresh);
    return () => window.removeEventListener('karibu-daily-status-changed', onRefresh);
  }, [fetchStatus]);

  const handleBack = () => {
    triggerHapticFeedback(window);
    const v = consumeKaribuDailyBack();
    setCurrentView(v);
  };

  const handleOpenTapArena = () => {
    triggerHapticFeedback(window);
    setCurrentView('game');
  };

  const handleClaim = async () => {
    if (!userTelegramInitData || !status?.canClaimToday || isClaiming) return;
    setIsClaiming(true);
    triggerHapticFeedback(window);
    try {
      const res = await fetch('/api/daily-reward', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData: userTelegramInitData }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Claim failed');
      incrementPoints(data.claimedReward);
      if (data.points != null) setPoints(data.points);
      if (data.pointsBalance != null) setPointsBalance(data.pointsBalance);
      if (data.status) setStatus(data.status);
      showToast(`+${formatNumber(data.claimedReward)} white pearls claimed!`, 'success');
      notifyPearlBalancesRefresh();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('karibu-daily-status-changed'));
      }
      // Send user straight to Tap Arena after claiming today’s reward.
      window.setTimeout(() => {
        setCurrentView('game');
      }, 550);
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Claim failed', 'error');
    } finally {
      setIsClaiming(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-ura-page min-h-screen flex flex-col max-w-xl mx-auto w-full text-white">
        <div className="flex items-center gap-3 px-4 pt-4 pb-2 border-b border-ura-border/60">
          <button
            type="button"
            onClick={handleBack}
            className="rounded-lg bg-ura-navy/65 border border-ura-border/75 px-3 py-1.5 text-sm font-semibold text-white"
          >
            ← Back
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="w-10 h-10 border-2 border-[#f3ba2f] border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-ura-page min-h-screen flex flex-col max-w-xl mx-auto w-full text-white pb-28">
      <div className="sticky top-0 z-10 bg-ura-page/95 backdrop-blur-sm border-b border-ura-border/60 px-4 pt-4 pb-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleBack}
            className="rounded-lg bg-ura-navy/65 border border-ura-border/75 px-3 py-1.5 text-sm font-semibold text-white shrink-0"
          >
            ← Back
          </button>
          <div className="min-w-0 flex-1 flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-ura-panel-2 flex items-center justify-center ring-2 ring-[#f3ba2f]/40 shrink-0">
              <Image src={pearlWhite} alt="" width={24} height={24} className="rounded" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-white leading-tight">Karibu Daily</h1>
              <p className="text-xs text-gray-400 truncate">10 days · miss a day and streak resets</p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 pt-4 pb-6 flex-1 overflow-y-auto no-scrollbar">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {status?.rewards.map((reward, dayIndex) => {
            const state = getKaribuDayState(dayIndex, status);
            const isClaimed = state === 'claimed';
            const isToday = state === 'today';
            const isFuture = state === 'future';
            const canClaim = isToday && status.canClaimToday && !status.claimedToday;

            return (
              <div
                key={dayIndex}
                className={`
                    relative rounded-xl p-3 flex flex-col items-center justify-center min-h-[88px]
                    transition-all duration-200
                    ${isClaimed ? 'bg-emerald-500/15 border border-emerald-500/30' : ''}
                    ${isToday && canClaim ? 'bg-gradient-to-b from-amber-500/25 to-[#f3ba2f]/15 border-2 border-[#f3ba2f] shadow-lg shadow-amber-500/20 pulse-animation' : ''}
                    ${isToday && status.claimedToday ? 'bg-emerald-500/15 border border-emerald-500/30' : ''}
                    ${isFuture ? 'bg-ura-panel-2/80 border border-ura-border/75 opacity-60' : ''}
                  `}
              >
                <span
                  className={`text-xs font-semibold mb-0.5 ${isClaimed ? 'text-emerald-400' : isToday && canClaim ? 'text-amber-300' : isFuture ? 'text-gray-500' : 'text-white'}`}
                >
                  Day {dayIndex + 1}
                </span>
                <div className="flex items-center gap-0.5">
                  <IceCube className={`w-4 h-4 ${isFuture ? 'opacity-50' : ''}`} />
                  <span className={`text-sm font-bold ${isFuture ? 'text-gray-500' : 'text-white'}`}>
                    {formatNumber(reward)}
                  </span>
                </div>
                {isClaimed && (
                  <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-emerald-500/90 flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
                {canClaim && (
                  <button
                    type="button"
                    onClick={handleClaim}
                    disabled={isClaiming}
                    className="mt-2 w-full py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-[#f3ba2f] text-black text-xs font-bold shadow-md hover:opacity-90 active:scale-[0.98] transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isClaiming ? (
                      <span className="inline-block w-3 h-3 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                    ) : (
                      'Claim'
                    )}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {status?.claimedToday && (
          <p className="text-center text-emerald-400 text-sm mt-6 font-medium">
            You claimed today — Tap Arena is unlocked. Come back tomorrow for the next reward!
          </p>
        )}
        {status && !status.claimedToday && status.canClaimToday && (
          <p className="text-center text-amber-300 text-sm mt-6 font-medium">
            Tap Claim on Day {status.currentStreakDay + 1} to unlock Tap Arena for today.
          </p>
        )}
        {status && !status.claimedToday && !status.canClaimToday && (
          <p className="text-center text-gray-400 text-sm mt-6">Unable to load claim status. Try again later.</p>
        )}

        {status ? (
          <div className="mt-8 space-y-2">
            <button
              type="button"
              onClick={handleOpenTapArena}
              className={`w-full py-3.5 rounded-xl text-sm font-bold shadow-md transition active:scale-[0.99] ${
                status.claimedToday
                  ? 'bg-gradient-to-r from-amber-500 to-[#f3ba2f] text-black hover:opacity-95 border border-amber-400/50'
                  : 'border-2 border-sky-500/45 bg-sky-950/25 text-sky-100 hover:bg-sky-900/35 hover:border-sky-400/55'
              }`}
            >
              Open Tap Arena
            </button>
            {!status.claimedToday && status.canClaimToday ? (
              <p className="text-center text-[11px] text-gray-500 px-1">
                Tapping stays locked until you claim today&apos;s reward above — or open Tap Arena to see your balance and progress.
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
