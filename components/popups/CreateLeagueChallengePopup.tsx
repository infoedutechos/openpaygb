'use client';

import React, { useState } from 'react';
import { triggerHapticFeedback } from '@/utils/ui';
import { useToast } from '@/contexts/ToastContext';
import { formatNumber } from '@/utils/ui';
import {
  LEAGUE_CHALLENGE_MIN_STAKE,
  LEAGUE_CHALLENGE_MAX_STAKE,
  LEAGUE_CHALLENGE_MIN_TARGET_PEARLS,
  LEAGUE_CHALLENGE_MAX_TARGET_PEARLS,
  LEAGUE_CHALLENGE_MIN_DAYS,
  LEAGUE_CHALLENGE_MAX_DAYS,
} from '@/utils/consts';

interface MyLeague {
  id: string;
  name: string;
  isCreator: boolean;
}

interface CreateLeagueChallengePopupProps {
  onClose: () => void;
  myLeagues: MyLeague[];
  onCreate: (params: { creatorLeagueId: string; opponentLeagueId: string; targetAlm: number; durationDays: number; stakePerLeague: number }) => Promise<void>;
  onSuccess: () => void;
}

export default function CreateLeagueChallengePopup({ onClose, myLeagues, onCreate, onSuccess }: CreateLeagueChallengePopupProps) {
  const [creatorLeagueId, setCreatorLeagueId] = useState(myLeagues[0]?.id ?? '');
  const [opponentCode, setOpponentCode] = useState('');
  const [opponentLeague, setOpponentLeague] = useState<{ id: string; name: string } | null>(null);
  const [targetAlm, setTargetAlm] = useState(100_000_000);
  const [durationDays, setDurationDays] = useState(7);
  const [stakePerLeague, setStakePerLeague] = useState(30_000_000);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const showToast = useToast();

  const creatorLeagues = myLeagues.filter((l) => l.isCreator);
  if (myLeagues.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-ura-navy/60 p-0 sm:items-center sm:p-4">
        <div className="max-h-[90dvh] w-full max-w-sm overflow-y-auto rounded-t-2xl bg-ura-panel p-6 sm:rounded-2xl">
          <p className="text-gray-300 mb-4">Create or join a league first, then you can challenge another league.</p>
          <button type="button" onClick={() => { triggerHapticFeedback(window); onClose(); }} className="min-h-[48px] w-full rounded-lg bg-ura-panel-2 py-2 text-white">Close</button>
        </div>
      </div>
    );
  }
  if (creatorLeagues.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-ura-navy/60 p-0 sm:items-center sm:p-4">
        <div className="max-h-[90dvh] w-full max-w-sm overflow-y-auto rounded-t-2xl bg-ura-panel p-6 sm:rounded-2xl">
          <p className="text-gray-300 mb-4">Only the creator of a league can start a challenge. Use a league you created.</p>
          <button type="button" onClick={() => { triggerHapticFeedback(window); onClose(); }} className="min-h-[48px] w-full rounded-lg bg-ura-panel-2 py-2 text-white">Close</button>
        </div>
      </div>
    );
  }

  const handleLookup = async () => {
    const code = opponentCode.trim().toUpperCase();
    if (!code) {
      showToast('Enter opponent league invite code', 'error');
      return;
    }
    triggerHapticFeedback(window);
    setLookupLoading(true);
    setOpponentLeague(null);
    try {
      const res = await fetch(`/api/leagues/by-code?code=${encodeURIComponent(code)}`);
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || 'League not found');
      }
      const data = await res.json();
      setOpponentLeague({ id: data.id, name: data.name });
      showToast(`Found: ${data.name}`, 'success');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'League not found', 'error');
    } finally {
      setLookupLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!creatorLeagueId || !opponentLeague) {
      showToast('Select your league and look up opponent league by code', 'error');
      return;
    }
    if (creatorLeagueId === opponentLeague.id) {
      showToast('Cannot challenge your own league', 'error');
      return;
    }
    const target = Math.floor(targetAlm);
    const days = Math.floor(durationDays);
    const stake = Math.floor(stakePerLeague);
    if (target < LEAGUE_CHALLENGE_MIN_TARGET_PEARLS || target > LEAGUE_CHALLENGE_MAX_TARGET_PEARLS) {
      showToast(`Target must be ${formatNumber(LEAGUE_CHALLENGE_MIN_TARGET_PEARLS)} - ${formatNumber(LEAGUE_CHALLENGE_MAX_TARGET_PEARLS)} PEARLS`, 'error');
      return;
    }
    if (days < LEAGUE_CHALLENGE_MIN_DAYS || days > LEAGUE_CHALLENGE_MAX_DAYS) {
      showToast(`Duration must be ${LEAGUE_CHALLENGE_MIN_DAYS}-${LEAGUE_CHALLENGE_MAX_DAYS} days`, 'error');
      return;
    }
    if (stake < LEAGUE_CHALLENGE_MIN_STAKE || stake > LEAGUE_CHALLENGE_MAX_STAKE) {
      showToast(`Stake must be ${formatNumber(LEAGUE_CHALLENGE_MIN_STAKE)} - ${formatNumber(LEAGUE_CHALLENGE_MAX_STAKE)} PEARLS`, 'error');
      return;
    }
    triggerHapticFeedback(window);
    setSubmitting(true);
    try {
      await onCreate({ creatorLeagueId, opponentLeagueId: opponentLeague.id, targetAlm: target, durationDays: days, stakePerLeague: stake });
      onSuccess();
      onClose();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to create challenge', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-ura-navy/60 p-0 sm:items-center sm:p-4">
      <div className="max-h-[90dvh] w-full max-w-xl flex flex-col overflow-hidden animate-slide-up rounded-t-3xl bg-ura-panel shadow-xl sm:max-h-[85vh] sm:animate-none sm:rounded-2xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-ura-border/75 shrink-0">
          <h2 className="text-lg font-bold text-white">Create league challenge</h2>
          <button type="button" onClick={() => { triggerHapticFeedback(window); onClose(); }} className="p-2 rounded-full text-gray-400 hover:text-white text-2xl">&times;</button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <p className="text-sm text-gray-400">Your league (you must be creator) stakes PEARLS. Opponent league creator must accept and stake the same to start. First to reach the target (or highest at the end) wins the full prize pool.</p>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Your league</label>
            <select
              value={creatorLeagueId}
              onChange={(e) => setCreatorLeagueId(e.target.value)}
              className="w-full bg-ura-panel-2 border border-ura-border/75 rounded-lg px-3 py-2 text-white"
            >
              {creatorLeagues.map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Opponent league (invite code)</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={opponentCode}
                onChange={(e) => { setOpponentCode(e.target.value.toUpperCase()); setOpponentLeague(null); }}
                placeholder="e.g. ABC12XYZ"
                className="flex-1 bg-ura-panel-2 border border-ura-border/75 rounded-lg px-3 py-2 text-white placeholder-gray-500 font-mono"
              />
              <button type="button" onClick={handleLookup} disabled={lookupLoading} className="py-2 px-4 rounded-lg bg-ura-panel-2 text-[#f3ba2f] font-medium disabled:opacity-50">{lookupLoading ? '…' : 'Look up'}</button>
            </div>
            {opponentLeague && <p className="text-sm text-emerald-400 mt-1">Opponent: {opponentLeague.name}</p>}
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Target PEARLS (first to reach wins, or highest at end)</label>
            <input
              type="number"
              min={LEAGUE_CHALLENGE_MIN_TARGET_PEARLS}
              max={LEAGUE_CHALLENGE_MAX_TARGET_PEARLS}
              value={targetAlm}
              onChange={(e) => setTargetAlm(Number(e.target.value))}
              className="w-full bg-ura-panel-2 border border-ura-border/75 rounded-lg px-3 py-2 text-white"
            />
            <p className="text-xs text-gray-500 mt-0.5">{formatNumber(LEAGUE_CHALLENGE_MIN_TARGET_PEARLS)} - {formatNumber(LEAGUE_CHALLENGE_MAX_TARGET_PEARLS)} PEARLS</p>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Duration (days)</label>
            <input
              type="number"
              min={LEAGUE_CHALLENGE_MIN_DAYS}
              max={LEAGUE_CHALLENGE_MAX_DAYS}
              value={durationDays}
              onChange={(e) => setDurationDays(Number(e.target.value))}
              className="w-full bg-ura-panel-2 border border-ura-border/75 rounded-lg px-3 py-2 text-white"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Stake per league (PEARLS) – you pay this now; opponent pays on accept</label>
            <input
              type="number"
              min={LEAGUE_CHALLENGE_MIN_STAKE}
              max={LEAGUE_CHALLENGE_MAX_STAKE}
              value={stakePerLeague}
              onChange={(e) => setStakePerLeague(Number(e.target.value))}
              className="w-full bg-ura-panel-2 border border-ura-border/75 rounded-lg px-3 py-2 text-white"
            />
            <p className="text-xs text-gray-500 mt-0.5">Prize pool = {formatNumber(stakePerLeague * 2)} PEARLS (others can add more)</p>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => { triggerHapticFeedback(window); onClose(); }} className="flex-1 py-3 rounded-xl bg-ura-panel-2 text-gray-300 font-medium">Cancel</button>
            <button type="button" onClick={handleSubmit} disabled={submitting || !opponentLeague} className="flex-1 py-3 rounded-xl bg-ura-gold text-black font-bold disabled:opacity-50">{submitting ? 'Creating…' : 'Create challenge'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
