'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { triggerHapticFeedback } from '@/utils/ui';
import { useToast } from '@/contexts/ToastContext';
import { formatNumber } from '@/utils/ui';

interface TeamChallengesPopupProps {
  onClose: () => void;
  initData: string;
  onCreateChallenge: () => void;
  onViewChallenge: (id: string) => void;
}

interface ChallengeItem {
  id: string;
  creatorTeamName: string;
  opponentTeamName: string | null;
  status: string;
  targetAlm: number;
  durationDays: number;
  stakePerTeam: number;
  prizePool: number;
  endsAt: string | null;
  contributionCount: number;
}

export default function TeamChallengesPopup({ onClose, initData, onCreateChallenge, onViewChallenge }: TeamChallengesPopupProps) {
  const [challenges, setChallenges] = useState<ChallengeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const showToast = useToast();

  const fetchChallenges = useCallback(async () => {
    try {
      const res = await fetch(`/api/team-challenges?initData=${encodeURIComponent(initData)}`);
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      setChallenges(data.challenges ?? []);
    } catch {
      showToast('Could not load challenges', 'error');
      setChallenges([]);
    } finally {
      setLoading(false);
    }
  }, [initData, showToast]);

  useEffect(() => {
    fetchChallenges();
  }, [fetchChallenges]);

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-ura-navy/60 p-0 sm:items-center sm:p-4">
      <div className="max-h-[90dvh] w-full max-w-xl flex flex-col overflow-hidden animate-slide-up rounded-t-3xl bg-ura-panel shadow-xl sm:max-h-[85vh] sm:animate-none sm:rounded-2xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-ura-border/75 shrink-0">
          <h2 className="text-lg font-bold text-white">Team vs Team</h2>
          <button type="button" onClick={() => { triggerHapticFeedback(window); onClose(); }} className="p-2 rounded-full text-gray-400 hover:text-white text-2xl">&times;</button>
        </div>
        <div className="p-4 flex flex-col gap-3 shrink-0">
          <p className="text-sm text-gray-400">Challenge another team: first to reach the target PEARLS (or highest at the end) wins the prize pool. Anyone can add to the prize pool.</p>
          <button
            type="button"
            onClick={() => { triggerHapticFeedback(window); onCreateChallenge(); }}
            className="w-full py-3 rounded-xl bg-ura-gold text-black font-bold"
          >
            Create challenge
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {loading ? (
            <p className="text-gray-400 text-center py-8">Loading…</p>
          ) : challenges.length === 0 ? (
            <p className="text-gray-400 text-center py-8">No active or pending challenges. Create one to get started.</p>
          ) : (
            <ul className="space-y-2">
              {challenges.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => { triggerHapticFeedback(window); onViewChallenge(c.id); }}
                    className="w-full text-left p-3 rounded-xl bg-[#252836] border border-ura-border/85 hover:border-[#f3ba2f]/40 transition-colors"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-white truncate">{c.creatorTeamName} vs {c.opponentTeamName ?? '…'}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          Target: {formatNumber(c.targetAlm)} PEARLS · {c.durationDays}d · Prize: {formatNumber(c.prizePool)} PEARLS
                          {c.contributionCount > 0 && ` · ${c.contributionCount} contribution(s)`}
                        </p>
                        <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium ${
                          c.status === 'active' ? 'bg-emerald-500/20 text-emerald-300' :
                          c.status === 'pending' ? 'bg-amber-500/20 text-amber-300' : 'bg-gray-500/20 text-gray-400'
                        }`}>
                          {c.status === 'active' ? 'Active' : c.status === 'pending' ? 'Pending accept' : c.status}
                        </span>
                      </div>
                      <span className="text-gray-500 shrink-0">→</span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
