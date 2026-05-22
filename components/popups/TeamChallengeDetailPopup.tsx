'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { triggerHapticFeedback } from '@/utils/ui';
import { useToast } from '@/contexts/ToastContext';
import { formatNumber } from '@/utils/ui';
import { TEAM_CHALLENGE_MIN_CONTRIBUTION } from '@/utils/consts';

interface TeamChallengeDetailPopupProps {
  challengeId: string;
  onClose: () => void;
  initData: string;
  onAccept?: () => void;
}

interface Detail {
  id: string;
  creatorTeamId: string;
  creatorTeamName: string;
  opponentTeamId: string | null;
  opponentTeamName: string | null;
  status: string;
  targetAlm: number;
  durationDays: number;
  prizePool: number;
  endsAt: string | null;
  winnerTeamId: string | null;
  canAccept: boolean;
  progressCreator: { totalGrowth: number; memberCount: number; participants: number };
  progressOpponent: { totalGrowth: number; memberCount: number; participants: number };
  recentContributions: Array<{ userName: string; amount: number; createdAt: string }>;
}

export default function TeamChallengeDetailPopup({ challengeId, onClose, initData, onAccept }: TeamChallengeDetailPopupProps) {
  const [data, setData] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [contributing, setContributing] = useState(false);
  const [contributeAmount, setContributeAmount] = useState('');
  const showToast = useToast();

  const fetchDetail = useCallback(async () => {
    try {
      const res = await fetch(`/api/team-challenges/${challengeId}?initData=${encodeURIComponent(initData)}`);
      if (!res.ok) throw new Error('Failed to load');
      const json = await res.json();
      setData(json);
    } catch {
      showToast('Could not load challenge', 'error');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [challengeId, initData, showToast]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const handleAccept = async () => {
    if (!data?.canAccept) return;
    triggerHapticFeedback(window);
    setAccepting(true);
    try {
      const res = await fetch(`/api/team-challenges/${challengeId}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'Failed');
      showToast('Challenge accepted! It has started.', 'success');
      onAccept?.();
      fetchDetail();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to accept', 'error');
    } finally {
      setAccepting(false);
    }
  };

  const handleContribute = async () => {
    const amt = Math.floor(Number(contributeAmount));
    if (!Number.isFinite(amt) || amt < TEAM_CHALLENGE_MIN_CONTRIBUTION) {
      showToast(`Minimum contribution is ${TEAM_CHALLENGE_MIN_CONTRIBUTION.toLocaleString()} PEARLS`, 'error');
      return;
    }
    triggerHapticFeedback(window);
    setContributing(true);
    try {
      const res = await fetch(`/api/team-challenges/${challengeId}/contribute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData, amount: amt }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'Failed');
      showToast(`Added ${formatNumber(amt)} PEARLS to prize pool!`, 'success');
      setContributeAmount('');
      fetchDetail();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to contribute', 'error');
    } finally {
      setContributing(false);
    }
  };

  if (loading) return <div className="fixed inset-0 z-50 flex items-end justify-center bg-ura-navy/60 p-0 sm:items-center sm:p-4"><div className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-ura-panel p-8 text-gray-400 sm:rounded-2xl">Loading…</div></div>;
  if (!data) return <div className="fixed inset-0 z-50 flex items-end justify-center bg-ura-navy/60 p-0 sm:items-center sm:p-4"><div className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-ura-panel p-8 sm:rounded-2xl"><p className="text-gray-400 mb-4">Challenge not found</p><button type="button" onClick={() => { triggerHapticFeedback(window); onClose(); }} className="min-h-[44px] rounded-lg bg-ura-panel-2 px-4 py-2 text-white">Close</button></div></div>;

  const pct1 = data.targetAlm > 0 ? Math.min(100, (data.progressCreator.totalGrowth / data.targetAlm) * 100) : 0;
  const pct2 = data.targetAlm > 0 ? Math.min(100, (data.progressOpponent.totalGrowth / data.targetAlm) * 100) : 0;
  const timeLeft = data.endsAt ? Math.max(0, new Date(data.endsAt).getTime() - Date.now()) : 0;
  const daysLeft = Math.ceil(timeLeft / (24 * 60 * 60 * 1000));

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-ura-navy/60 p-0 sm:items-center sm:p-4">
      <div className="max-h-[90dvh] w-full max-w-xl flex flex-col overflow-hidden animate-slide-up rounded-t-3xl bg-ura-panel shadow-xl sm:max-h-[85vh] sm:animate-none sm:rounded-2xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-ura-border/75 shrink-0">
          <h2 className="text-lg font-bold text-white">Team vs Team</h2>
          <button type="button" onClick={() => { triggerHapticFeedback(window); onClose(); }} className="p-2 rounded-full text-gray-400 hover:text-white text-2xl">&times;</button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <p className="text-white font-medium">{data.creatorTeamName} vs {data.opponentTeamName ?? '…'}</p>
          <p className="text-sm text-gray-400">Target: {formatNumber(data.targetAlm)} PEARLS · {data.durationDays} day(s)</p>
          <p className="text-[#f3ba2f] font-semibold">Prize pool: {formatNumber(data.prizePool)} PEARLS</p>

          {data.status === 'pending' && data.canAccept && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
              <p className="text-amber-200 text-sm mb-2">You can accept this challenge (stake: {formatNumber(data.prizePool / 2)} PEARLS).</p>
              <button type="button" onClick={handleAccept} disabled={accepting} className="py-2 px-4 rounded-lg bg-amber-500 text-black font-bold disabled:opacity-50">{accepting ? 'Accepting…' : 'Accept challenge'}</button>
            </div>
          )}

          {data.status === 'active' && (
            <>
              <p className="text-gray-400 text-sm">Time left: ~{daysLeft} day(s)</p>
              <div>
                <p className="text-xs text-gray-400 mb-1">{data.creatorTeamName}</p>
                <div className="h-6 rounded-full bg-ura-panel-2 overflow-hidden">
                  <div className="h-full bg-emerald-500/80 rounded-full transition-all" style={{ width: `${pct1}%` }} />
                </div>
                <p className="text-xs text-emerald-300 mt-0.5">{formatNumber(data.progressCreator.totalGrowth)} PEARLS · {data.progressCreator.participants} participants</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">{data.opponentTeamName ?? 'Opponent'}</p>
                <div className="h-6 rounded-full bg-ura-panel-2 overflow-hidden">
                  <div className="h-full bg-violet-500/80 rounded-full transition-all" style={{ width: `${pct2}%` }} />
                </div>
                <p className="text-xs text-violet-300 mt-0.5">{formatNumber(data.progressOpponent.totalGrowth)} PEARLS · {data.progressOpponent.participants} participants</p>
              </div>
              <div className="pt-2">
                <p className="text-sm text-gray-400 mb-2">Add to prize pool (anyone can contribute)</p>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min={TEAM_CHALLENGE_MIN_CONTRIBUTION}
                    placeholder={TEAM_CHALLENGE_MIN_CONTRIBUTION.toLocaleString()}
                    value={contributeAmount}
                    onChange={(e) => setContributeAmount(e.target.value)}
                    className="flex-1 bg-ura-panel-2 border border-ura-border/75 rounded-lg px-3 py-2 text-white"
                  />
                  <button type="button" onClick={handleContribute} disabled={contributing} className="py-2 px-4 rounded-lg bg-ura-gold text-black font-bold disabled:opacity-50">{contributing ? '…' : 'Contribute'}</button>
                </div>
              </div>
            </>
          )}

          {data.status === 'completed' && data.winnerTeamId && (
            <p className="text-emerald-400 font-medium">Completed · Winner: {data.winnerTeamId === data.creatorTeamId ? data.creatorTeamName : (data.opponentTeamName ?? 'Opponent')}</p>
          )}

          {data.recentContributions.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-gray-400 mb-1">Recent contributions</p>
              <ul className="space-y-0.5 text-sm text-gray-300">
                {data.recentContributions.map((c, i) => (
                  <li key={i}>{c.userName}: +{formatNumber(c.amount)} PEARLS</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
