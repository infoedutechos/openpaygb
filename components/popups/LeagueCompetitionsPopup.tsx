'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { triggerHapticFeedback } from '@/utils/ui';
import { useToast } from '@/contexts/ToastContext';
import { formatNumber } from '@/utils/ui';
import {
  LEAGUE_CHALLENGE_MIN_TARGET_PEARLS,
  LEAGUE_CHALLENGE_MAX_TARGET_PEARLS,
  LEAGUE_CHALLENGE_MIN_STAKE,
  LEAGUE_CHALLENGE_MAX_STAKE,
  LEAGUE_CHALLENGE_MIN_DAYS,
  LEAGUE_CHALLENGE_MAX_DAYS,
} from '@/utils/consts';

interface LeagueCompetitionsPopupProps {
  onClose: () => void;
  initData: string;
  /** Leagues where user is creator (for "Create challenge" dropdown) */
  myCreatorLeagues: Array< { id: string; name: string } >;
  userBalance: number;
}

interface CompetitionListItem {
  id: string;
  creatorLeague: { id: string; name: string };
  opponentLeague: { id: string; name: string };
  targetAlm: number;
  stakePerLeague: number;
  prizePool: number;
  durationDays: number;
  status: string;
  startAt: string | null;
  endAt: string | null;
  winnerLeagueId: string | null;
  createdAt: string;
  isMine: boolean;
}

interface CompetitionDetail extends CompetitionListItem {
  creatorProgress: number;
  creatorMemberCount: number;
  opponentProgress: number;
  opponentMemberCount: number;
}

function formatTimeLeft(endAt: string | null): string {
  if (!endAt) return '—';
  const end = new Date(endAt);
  const now = new Date();
  if (now >= end) return 'Ended';
  const d = Math.floor((end.getTime() - now.getTime()) / 86400_000);
  const h = Math.floor(((end.getTime() - now.getTime()) % 86400_000) / 3600_000);
  if (d > 0) return `${d}d ${h}h left`;
  return `${h}h left`;
}

export default function LeagueCompetitionsPopup({
  onClose,
  initData,
  myCreatorLeagues,
  userBalance,
}: LeagueCompetitionsPopupProps) {
  const [competitions, setCompetitions] = useState<CompetitionListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'detail' | 'create'>('list');
  const [detail, setDetail] = useState<CompetitionDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [contributingId, setContributingId] = useState<string | null>(null);
  const [contributeAmount, setContributeAmount] = useState('');
  const [creating, setCreating] = useState(false);
  const showToast = useToast();

  const fetchList = useCallback(async () => {
    try {
      const res = await fetch(`/api/league-competitions?initData=${encodeURIComponent(initData)}`);
      if (res.ok) {
        const data = await res.json();
        setCompetitions(data.competitions ?? []);
      }
    } catch {
      showToast('Could not load competitions', 'error');
    } finally {
      setLoading(false);
    }
  }, [initData, showToast]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const fetchDetail = useCallback(async (id: string) => {
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/league-competitions/${id}`);
      if (res.ok) {
        const data = await res.json();
        setDetail(data);
      } else {
        const err = await res.json();
        showToast(err.error || 'Could not load competition', 'error');
      }
    } catch {
      showToast('Could not load competition', 'error');
    } finally {
      setDetailLoading(false);
    }
  }, [showToast]);

  const openDetail = (id: string) => {
    triggerHapticFeedback(window);
    setDetail(null);
    setView('detail');
    fetchDetail(id);
  };

  const handleAccept = async (id: string) => {
    triggerHapticFeedback(window);
    setAcceptingId(id);
    try {
      const res = await fetch(`/api/league-competitions/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Accept failed', 'error');
        return;
      }
      showToast('Challenge accepted! Competition started.', 'success');
      setView('list');
      setDetail(null);
      fetchList();
    } catch {
      showToast('Request failed', 'error');
    } finally {
      setAcceptingId(null);
    }
  };

  const handleContribute = async (id: string) => {
    const amt = Math.floor(Number(contributeAmount));
    if (!Number.isFinite(amt) || amt <= 0) {
      showToast('Enter a valid PEARLS amount', 'error');
      return;
    }
    if (amt > Math.floor(userBalance)) {
      showToast('Insufficient PEARLS balance', 'error');
      return;
    }
    triggerHapticFeedback(window);
    setContributingId(id);
    try {
      const res = await fetch(`/api/league-competitions/${id}/contribute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData, amount: amt }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Contribute failed', 'error');
        return;
      }
      showToast(`Added ${formatNumber(amt)} PEARLS to prize pool!`, 'success');
      setContributeAmount('');
      if (detail && detail.id === id) fetchDetail(id);
      fetchList();
    } catch {
      showToast('Request failed', 'error');
    } finally {
      setContributingId(null);
    }
  };

  const activeList = competitions.filter((c) => c.status === 'active');
  const pendingList = competitions.filter((c) => c.status === 'pending_accept');
  const endedList = competitions.filter((c) => c.status === 'ended');

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-ura-navy/60 p-0 sm:items-center sm:p-4">
      <div className="max-h-[90dvh] w-full max-w-xl flex flex-col overflow-hidden animate-slide-up rounded-t-3xl bg-ura-panel shadow-xl sm:max-h-[85vh] sm:animate-none sm:rounded-2xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-ura-border/75 shrink-0">
          <h2 className="text-lg font-bold text-white">
            {view === 'list' && 'League Competition'}
            {view === 'detail' && 'Competition'}
            {view === 'create' && 'Create challenge'}
          </h2>
          <button
            type="button"
            onClick={() => {
              triggerHapticFeedback(window);
              if (view === 'detail' || view === 'create') {
                setView('list');
                setDetail(null);
              } else {
                onClose();
              }
            }}
            className="p-2 rounded-full text-gray-400 hover:text-white hover:bg-white/10 text-2xl"
            aria-label="Back or Close"
          >
            {view !== 'list' ? '←' : '×'}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {view === 'list' && (
            <>
              <p className="text-sm text-gray-400 mb-4">
                Challenge another league: first to hit the target PEARLS (or highest at the end) wins the prize pool. Spectators can add to the pool.
              </p>
              <div className="flex justify-end mb-4">
                <button
                  type="button"
                  onClick={() => {
                    triggerHapticFeedback(window);
                    setView('create');
                  }}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-black font-bold text-sm"
                >
                  Create challenge
                </button>
              </div>

              {loading ? (
                <p className="text-gray-400 text-center py-8">Loading…</p>
              ) : (
                <div className="space-y-6">
                  {activeList.length > 0 && (
                    <section>
                      <h3 className="text-sm font-semibold text-amber-400 mb-2">Active</h3>
                      <ul className="space-y-2">
                        {activeList.map((c) => (
                          <li key={c.id}>
                            <button
                              type="button"
                              onClick={() => openDetail(c.id)}
                              className="w-full text-left p-3 rounded-xl bg-[#252836] border border-ura-border/75 hover:border-amber-500/40 transition-colors"
                            >
                              <div className="flex justify-between items-start gap-2">
                                <div>
                                  <p className="font-medium text-white">
                                    {c.creatorLeague.name} vs {c.opponentLeague.name}
                                  </p>
                                  <p className="text-xs text-gray-400 mt-0.5">
                                    Target {formatNumber(c.targetAlm)} PEARLS · {c.durationDays}d · Prize pool {formatNumber(c.prizePool)} PEARLS
                                  </p>
                                  <p className="text-xs text-amber-400 mt-0.5">{formatTimeLeft(c.endAt)}</p>
                                </div>
                                <span className="text-gray-500">→</span>
                              </div>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </section>
                  )}
                  {pendingList.length > 0 && (
                    <section>
                      <h3 className="text-sm font-semibold text-violet-400 mb-2">Pending acceptance</h3>
                      <ul className="space-y-2">
                        {pendingList.map((c) => (
                          <li key={c.id}>
                            <button
                              type="button"
                              onClick={() => openDetail(c.id)}
                              className="w-full text-left p-3 rounded-xl bg-[#252836] border border-ura-border/75 hover:border-violet-500/40 transition-colors"
                            >
                              <div className="flex justify-between items-start gap-2">
                                <div>
                                  <p className="font-medium text-white">
                                    {c.creatorLeague.name} vs {c.opponentLeague.name}
                                  </p>
                                  <p className="text-xs text-gray-400 mt-0.5">
                                    Target {formatNumber(c.targetAlm)} PEARLS · Stake {formatNumber(c.stakePerLeague)} PEARLS each
                                  </p>
                                  {c.isMine && (
                                    <p className="text-xs text-violet-300 mt-0.5">You’re in one of these leagues</p>
                                  )}
                                </div>
                                <span className="text-gray-500">→</span>
                              </div>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </section>
                  )}
                  {endedList.length > 0 && (
                    <section>
                      <h3 className="text-sm font-semibold text-gray-400 mb-2">Ended</h3>
                      <ul className="space-y-2">
                        {endedList.map((c) => (
                          <li key={c.id}>
                            <button
                              type="button"
                              onClick={() => openDetail(c.id)}
                              className="w-full text-left p-3 rounded-xl bg-[#252836] border border-ura-border/85"
                            >
                              <div className="flex justify-between items-start gap-2">
                                <div>
                                  <p className="font-medium text-white">
                                    {c.creatorLeague.name} vs {c.opponentLeague.name}
                                  </p>
                                  <p className="text-xs text-gray-400 mt-0.5">
                                    {c.winnerLeagueId
                                      ? `Winner: ${
                                          c.winnerLeagueId === c.creatorLeague.id ? c.creatorLeague.name : c.opponentLeague.name
                                        }`
                                      : 'Ended'}
                                  </p>
                                </div>
                                <span className="text-gray-500">→</span>
                              </div>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </section>
                  )}
                  {!loading && activeList.length === 0 && pendingList.length === 0 && endedList.length === 0 && (
                    <p className="text-gray-400 text-center py-8">No competitions yet. Create a challenge to get started.</p>
                  )}
                </div>
              )}
            </>
          )}

          {view === 'detail' && (
            <>
              {detailLoading && !detail ? (
                <p className="text-gray-400 text-center py-8">Loading…</p>
              ) : detail ? (
                <div className="space-y-4">
                  <div className="p-3 rounded-xl bg-[#252836] border border-ura-border/75">
                    <p className="font-bold text-white text-center">
                      {detail.creatorLeague.name} vs {detail.opponentLeague.name}
                    </p>
                    <p className="text-sm text-gray-400 text-center mt-1">
                      First to {formatNumber(detail.targetAlm)} PEARLS in {detail.durationDays} day{detail.durationDays !== 1 ? 's' : ''} — or highest at the end wins
                    </p>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-amber-400 font-semibold">Prize pool</span>
                    <span className="text-white font-bold">{formatNumber(detail.prizePool)} PEARLS</span>
                  </div>
                  {detail.status === 'active' && detail.endAt && (
                    <p className="text-sm text-gray-400">Time left: {formatTimeLeft(detail.endAt)}</p>
                  )}
                  {detail.status === 'ended' && detail.winnerLeagueId && (
                    <p className="text-sm text-emerald-400 font-medium">
                      Winner: {detail.winnerLeagueId === detail.creatorLeague.id ? detail.creatorLeague.name : detail.opponentLeague.name}
                    </p>
                  )}

                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-400">{detail.creatorLeague.name}</span>
                        <span className="text-white">
                          {formatNumber(detail.creatorProgress)} / {formatNumber(detail.targetAlm)} PEARLS
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-ura-panel-2 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-amber-500/80 transition-all"
                          style={{
                            width: `${Math.min(100, (detail.creatorProgress / detail.targetAlm) * 100)}%`,
                          }}
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{detail.creatorMemberCount} participants</p>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-400">{detail.opponentLeague.name}</span>
                        <span className="text-white">
                          {formatNumber(detail.opponentProgress)} / {formatNumber(detail.targetAlm)} PEARLS
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-ura-panel-2 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-violet-500/80 transition-all"
                          style={{
                            width: `${Math.min(100, (detail.opponentProgress / detail.targetAlm) * 100)}%`,
                          }}
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{detail.opponentMemberCount} participants</p>
                    </div>
                  </div>

                  {detail.status === 'pending_accept' && detail.isMine && (
                    <button
                      type="button"
                      disabled={acceptingId === detail.id}
                      onClick={() => handleAccept(detail.id)}
                      className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold disabled:opacity-50"
                    >
                      {acceptingId === detail.id ? 'Accepting…' : 'Accept challenge (lock your stake)'}
                    </button>
                  )}

                  {detail.status === 'active' && (
                    <div className="p-3 rounded-xl bg-ura-panel-2 border border-ura-border/85">
                      <p className="text-sm font-medium text-white mb-2">Add to prize pool</p>
                      <p className="text-xs text-gray-400 mb-2">Anyone can contribute; the pool grows for the winner.</p>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          min={1}
                          placeholder="PEARLS amount"
                          value={contributeAmount}
                          onChange={(e) => setContributeAmount(e.target.value)}
                          className="flex-1 px-3 py-2 rounded-lg bg-[#252836] border border-ura-border/75 text-white placeholder-gray-500"
                        />
                        <button
                          type="button"
                          disabled={contributingId === detail.id}
                          onClick={() => handleContribute(detail.id)}
                          className="px-4 py-2 rounded-lg bg-amber-500 text-black font-bold text-sm disabled:opacity-50"
                        >
                          {contributingId === detail.id ? '…' : 'Contribute'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-gray-400">Competition not found.</p>
              )}
            </>
          )}

          {view === 'create' && (
            <CreateChallengeForm
              initData={initData}
              myCreatorLeagues={myCreatorLeagues}
              userBalance={userBalance}
              creating={creating}
              setCreating={setCreating}
              onSuccess={() => {
                showToast('Challenge created. Share with the other league to accept!', 'success');
                setView('list');
                fetchList();
              }}
              onError={(msg) => showToast(msg, 'error')}
            />
          )}
        </div>
      </div>
    </div>
  );
}

interface CreateChallengeFormProps {
  initData: string;
  myCreatorLeagues: Array<{ id: string; name: string }>;
  userBalance: number;
  creating: boolean;
  setCreating: (v: boolean) => void;
  onSuccess: () => void;
  onError: (msg: string) => void;
}

function CreateChallengeForm({
  initData,
  myCreatorLeagues,
  userBalance,
  creating,
  setCreating,
  onSuccess,
  onError,
}: CreateChallengeFormProps) {
  const [creatorLeagueId, setCreatorLeagueId] = useState('');
  const [opponentInviteCode, setOpponentInviteCode] = useState('');
  const [targetAlm, setTargetAlm] = useState(String(100_000_000));
  const [stakePerLeague, setStakePerLeague] = useState(String(30_000_000));
  const [durationDays, setDurationDays] = useState('7');

  useEffect(() => {
    if (myCreatorLeagues.length > 0 && !creatorLeagueId) setCreatorLeagueId(myCreatorLeagues[0].id);
  }, [myCreatorLeagues, creatorLeagueId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const target = Math.floor(Number(targetAlm));
    const stake = Math.floor(Number(stakePerLeague));
    const duration = parseInt(durationDays, 10);
    if (!creatorLeagueId || !opponentInviteCode.trim()) {
      onError('Select your league and enter opponent invite code');
      return;
    }
    if (!Number.isFinite(target) || target < LEAGUE_CHALLENGE_MIN_TARGET_PEARLS || target > LEAGUE_CHALLENGE_MAX_TARGET_PEARLS) {
      onError(`Target PEARLS must be between ${formatNumber(LEAGUE_CHALLENGE_MIN_TARGET_PEARLS)} and ${formatNumber(LEAGUE_CHALLENGE_MAX_TARGET_PEARLS)}`);
      return;
    }
    if (!Number.isFinite(stake) || stake < LEAGUE_CHALLENGE_MIN_STAKE || stake > LEAGUE_CHALLENGE_MAX_STAKE) {
      onError(`Stake must be between ${formatNumber(LEAGUE_CHALLENGE_MIN_STAKE)} and ${formatNumber(LEAGUE_CHALLENGE_MAX_STAKE)}`);
      return;
    }
    if (!Number.isInteger(duration) || duration < LEAGUE_CHALLENGE_MIN_DAYS || duration > LEAGUE_CHALLENGE_MAX_DAYS) {
      onError(`Duration must be ${LEAGUE_CHALLENGE_MIN_DAYS}–${LEAGUE_CHALLENGE_MAX_DAYS} days`);
      return;
    }
    if (stake > Math.floor(userBalance)) {
      onError('Insufficient PEARLS for stake');
      return;
    }
    triggerHapticFeedback(window);
    setCreating(true);
    try {
      const res = await fetch('/api/league-competitions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          initData,
          creatorLeagueId,
          opponentInviteCode: opponentInviteCode.trim(),
          targetAlm: target,
          stakePerLeague: stake,
          durationDays: duration,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        onError(data.error || 'Create failed');
        return;
      }
      onSuccess();
    } catch {
      onError('Request failed');
    } finally {
      setCreating(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-gray-400">
        Your league stakes PEARLS; the other league’s creator must accept and lock the same stake. First to reach the target (or highest at the end) wins the full prize pool.
      </p>
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Your league (challenger)</label>
        <select
          value={creatorLeagueId}
          onChange={(e) => setCreatorLeagueId(e.target.value)}
          className="w-full px-3 py-2 rounded-lg bg-[#252836] border border-ura-border/75 text-white"
        >
          {myCreatorLeagues.length === 0 ? (
            <option value="">You must create a league first</option>
          ) : (
            myCreatorLeagues.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))
          )}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Opponent league invite code</label>
        <input
          type="text"
          value={opponentInviteCode}
          onChange={(e) => setOpponentInviteCode(e.target.value)}
          placeholder="e.g. ABC12XYZ"
          className="w-full px-3 py-2 rounded-lg bg-[#252836] border border-ura-border/75 text-white placeholder-gray-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Target PEARLS (first to reach wins, or highest at end)</label>
        <input
          type="number"
          min={LEAGUE_CHALLENGE_MIN_TARGET_PEARLS}
          max={LEAGUE_CHALLENGE_MAX_TARGET_PEARLS}
          value={targetAlm}
          onChange={(e) => setTargetAlm(e.target.value)}
          className="w-full px-3 py-2 rounded-lg bg-[#252836] border border-ura-border/75 text-white"
        />
        <p className="text-xs text-gray-500 mt-0.5">
          {formatNumber(LEAGUE_CHALLENGE_MIN_TARGET_PEARLS)} – {formatNumber(LEAGUE_CHALLENGE_MAX_TARGET_PEARLS)}
        </p>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Stake per league (PEARLS) — you lock this now</label>
        <input
          type="number"
          min={LEAGUE_CHALLENGE_MIN_STAKE}
          max={LEAGUE_CHALLENGE_MAX_STAKE}
          value={stakePerLeague}
          onChange={(e) => setStakePerLeague(e.target.value)}
          className="w-full px-3 py-2 rounded-lg bg-[#252836] border border-ura-border/75 text-white"
        />
        <p className="text-xs text-gray-500 mt-0.5">Your balance: {formatNumber(Math.floor(userBalance))} PEARLS</p>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Duration (days)</label>
        <input
          type="number"
          min={LEAGUE_CHALLENGE_MIN_DAYS}
          max={LEAGUE_CHALLENGE_MAX_DAYS}
          value={durationDays}
          onChange={(e) => setDurationDays(e.target.value)}
          className="w-full px-3 py-2 rounded-lg bg-[#252836] border border-ura-border/75 text-white"
        />
      </div>
      <button
        type="submit"
        disabled={creating || myCreatorLeagues.length === 0}
        className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-black font-bold disabled:opacity-50"
      >
        {creating ? 'Creating…' : 'Create challenge'}
      </button>
    </form>
  );
}
