'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { triggerHapticFeedback } from '@/utils/ui';
import { useToast } from '@/contexts/ToastContext';
import { formatNumber } from '@/utils/ui';
import { GLOBAL_TASK_MIN_STAKE, GLOBAL_TASK_MAX_STAKE } from '@/utils/consts';

interface Template {
  id: string;
  name: string;
  participantType: string;
  metric: string;
  targetValue: number;
  targetLabel: string;
  durationDays: number;
  managementBonusPercent: number;
}

interface Challenge {
  id: string;
  taskName: string;
  targetLabel: string;
  status: string;
  creatorName: string;
  opponentName: string;
  prizePool: number;
  endsAt: string | null;
  creatorProgress: number;
  opponentProgress: number;
  canAccept: boolean;
}

interface GlobalTasksPopupProps {
  onClose: () => void;
  initData: string | null;
  myTeams: Array<{ id: string; name: string; isCreator: boolean }>;
  myLeagues: Array<{ id: string; name: string; isCreator: boolean }>;
}

export default function GlobalTasksPopup({ onClose, initData, myTeams, myLeagues }: GlobalTasksPopupProps) {
  const creatorTeams = useMemo(() => myTeams.filter((t) => t.isCreator), [myTeams]);
  const creatorLeagues = useMemo(() => myLeagues.filter((l) => l.isCreator), [myLeagues]);
  const [tab, setTab] = useState<'browse' | 'challenges'>('browse');
  const [templates, setTemplates] = useState<Template[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteTaskId, setInviteTaskId] = useState<string | null>(null);
  const [inviteStake, setInviteStake] = useState('');
  const [inviteCreatorTeamId, setInviteCreatorTeamId] = useState('');
  const [inviteCreatorLeagueId, setInviteCreatorLeagueId] = useState('');
  const [inviteOpponentTeamId, setInviteOpponentTeamId] = useState('');
  const [inviteOpponentLeagueId, setInviteOpponentLeagueId] = useState('');
  const [allTeams, setAllTeams] = useState<Array<{ id: string; name: string }>>([]);
  const [allLeagues, setAllLeagues] = useState<Array<{ id: string; name: string }>>([]);
  const [loadingOpponents, setLoadingOpponents] = useState(false);
  const [sending, setSending] = useState(false);
  const [acceptChallengeId, setAcceptChallengeId] = useState<string | null>(null);
  const [acceptStake, setAcceptStake] = useState('');
  const [accepting, setAccepting] = useState(false);
  const showToast = useToast();

  const fetchTemplates = useCallback(async () => {
    try {
      const res = await fetch('/api/global-tasks');
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      setTemplates(data.tasks ?? []);
    } catch {
      showToast('Could not load competitions', 'error');
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  const fetchChallenges = useCallback(async () => {
    if (!initData) return;
    try {
      const res = await fetch(`/api/global-tasks/challenges?initData=${encodeURIComponent(initData)}`);
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      setChallenges(data.challenges ?? []);
    } catch {
      setChallenges([]);
    }
  }, [initData]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  useEffect(() => {
    if (initData && tab === 'challenges') fetchChallenges();
  }, [initData, tab, fetchChallenges]);

  const openInvite = (task: Template) => {
    triggerHapticFeedback(window);
    setInviteTaskId(task.id);
    setInviteStake('');
    setInviteCreatorTeamId(task.participantType === 'team' ? (creatorTeams[0]?.id ?? '') : '');
    setInviteCreatorLeagueId(task.participantType === 'league' ? (creatorLeagues[0]?.id ?? '') : '');
    setInviteOpponentTeamId('');
    setInviteOpponentLeagueId('');
    setAllTeams([]);
    setAllLeagues([]);
    if (task.participantType === 'team') {
      setLoadingOpponents(true);
      fetch('/api/teams/list')
        .then((r) => r.json())
        .then((d) => setAllTeams((d.teams ?? []).map((t: { id: string; name: string }) => ({ id: t.id, name: t.name }))))
        .catch(() => setAllTeams([]))
        .finally(() => setLoadingOpponents(false));
    } else {
      setLoadingOpponents(true);
      const url = initData ? `/api/leagues/list?initData=${encodeURIComponent(initData)}` : '/api/leagues/list';
      fetch(url)
        .then((r) => r.json())
        .then((d) => setAllLeagues((d.leagues ?? []).map((l: { id: string; name: string }) => ({ id: l.id, name: l.name }))))
        .catch(() => setAllLeagues([]))
        .finally(() => setLoadingOpponents(false));
    }
  };

  const submitInvite = async () => {
    if (!inviteTaskId || !initData) return;
    const stake = Number(inviteStake.replace(/\D/g, ''));
    if (!Number.isFinite(stake) || stake < GLOBAL_TASK_MIN_STAKE || stake > GLOBAL_TASK_MAX_STAKE) {
      showToast(`Stake ${formatNumber(GLOBAL_TASK_MIN_STAKE)}–${formatNumber(GLOBAL_TASK_MAX_STAKE)} PEARLS`, 'error');
      return;
    }
    const task = templates.find((t) => t.id === inviteTaskId);
    if (!task) return;
    const creatorTeamId = task.participantType === 'team' ? inviteCreatorTeamId.trim() || undefined : undefined;
    const creatorLeagueId = task.participantType === 'league' ? inviteCreatorLeagueId.trim() || undefined : undefined;
    const opponentTeamId = task.participantType === 'team' ? inviteOpponentTeamId.trim() || undefined : undefined;
    const opponentLeagueId = task.participantType === 'league' ? inviteOpponentLeagueId.trim() || undefined : undefined;
    if (!creatorTeamId && !creatorLeagueId) {
      showToast('Select your team or league', 'error');
      return;
    }
    if (!opponentTeamId && !opponentLeagueId) {
      showToast('Select or enter opponent team or league', 'error');
      return;
    }
    setSending(true);
    try {
      const body: Record<string, unknown> = {
        initData,
        creatorTeamId: creatorTeamId || undefined,
        creatorLeagueId: creatorLeagueId || undefined,
        opponentTeamId: opponentTeamId || undefined,
        opponentLeagueId: opponentLeagueId || undefined,
        creatorStake: stake,
      };
      const res = await fetch(`/api/global-tasks/${inviteTaskId}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Invite failed');
      showToast('Invite sent. Opponent must accept to start.', 'success');
      setInviteTaskId(null);
      setInviteStake('');
      fetchChallenges();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Invite failed', 'error');
    } finally {
      setSending(false);
    }
  };

  const submitAccept = async () => {
    if (!acceptChallengeId || !initData) return;
    const stake = Number(acceptStake.replace(/\D/g, ''));
    if (!Number.isFinite(stake) || stake < GLOBAL_TASK_MIN_STAKE || stake > GLOBAL_TASK_MAX_STAKE) {
      showToast(`Stake ${formatNumber(GLOBAL_TASK_MIN_STAKE)}–${formatNumber(GLOBAL_TASK_MAX_STAKE)} PEARLS`, 'error');
      return;
    }
    setAccepting(true);
    try {
      const res = await fetch(`/api/global-tasks/challenges/${acceptChallengeId}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData, opponentStake: stake }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Accept failed');
      showToast('Challenge started! First to reach target wins.', 'success');
      setAcceptChallengeId(null);
      setAcceptStake('');
      fetchChallenges();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Accept failed', 'error');
    } finally {
      setAccepting(false);
    }
  };

  const task = inviteTaskId ? templates.find((t) => t.id === inviteTaskId) : null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-ura-navy/60 p-0 sm:items-center sm:p-4">
      <div className="max-h-[90dvh] w-full max-w-xl flex flex-col overflow-hidden animate-slide-up rounded-t-3xl bg-ura-panel shadow-xl sm:max-h-[85vh] sm:animate-none sm:rounded-2xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-ura-border/75 shrink-0">
          <h2 className="text-lg font-bold text-white">Competitions</h2>
          <button type="button" onClick={() => { triggerHapticFeedback(window); onClose(); }} className="p-2 rounded-full text-gray-400 hover:text-white text-2xl">&times;</button>
        </div>
        <p className="px-4 py-2 text-sm text-gray-400 shrink-0">
          Invite another team or league. When they accept, both stake PEARLS; first to reach target in time wins. Management adds 30% to the pool.
        </p>
        <div className="flex border-b border-ura-border/75 px-2 shrink-0">
          <button type="button" onClick={() => { setTab('browse'); setInviteTaskId(null); setAcceptChallengeId(null); }} className={`px-4 py-2 text-sm font-medium ${tab === 'browse' ? 'border-b-2 border-[#f3ba2f] text-[#f3ba2f]' : 'text-gray-400'}`}>
            Browse
          </button>
          <button type="button" onClick={() => setTab('challenges')} className={`px-4 py-2 text-sm font-medium ${tab === 'challenges' ? 'border-b-2 border-[#f3ba2f] text-[#f3ba2f]' : 'text-gray-400'}`}>
            My challenges
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {loading && tab === 'browse' ? (
            <p className="text-gray-400 text-center py-8">Loading…</p>
          ) : inviteTaskId && task ? (
            <div className="space-y-3 py-2">
              <p className="text-white font-medium">{task.name}</p>
              {task.participantType === 'team' && (
                <>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Your team</label>
                    <select value={inviteCreatorTeamId} onChange={(e) => setInviteCreatorTeamId(e.target.value)} className="w-full bg-[#252836] border border-ura-border/75 rounded-lg px-3 py-2 text-white">
                      <option value="">Select</option>
                      {creatorTeams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Opponent team</label>
                    {loadingOpponents ? (
                      <p className="text-sm text-gray-500 py-2">Loading teams…</p>
                    ) : (
                      <select
                        value={inviteOpponentTeamId}
                        onChange={(e) => setInviteOpponentTeamId(e.target.value)}
                        className="w-full bg-[#252836] border border-ura-border/75 rounded-lg px-3 py-2 text-white"
                      >
                        <option value="">Select a team</option>
                        {allTeams.filter((t) => !creatorTeams.some((c) => c.id === t.id)).map((t) => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                    )}
                    <p className="text-xs text-gray-500 mt-1">Choose the team you want to challenge</p>
                  </div>
                </>
              )}
              {task.participantType === 'league' && (
                <>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Your league</label>
                    <select value={inviteCreatorLeagueId} onChange={(e) => setInviteCreatorLeagueId(e.target.value)} className="w-full bg-[#252836] border border-ura-border/75 rounded-lg px-3 py-2 text-white">
                      <option value="">Select</option>
                      {creatorLeagues.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Opponent league</label>
                    {loadingOpponents ? (
                      <p className="text-sm text-gray-500 py-2">Loading leagues…</p>
                    ) : (
                      <select
                        value={inviteOpponentLeagueId}
                        onChange={(e) => setInviteOpponentLeagueId(e.target.value)}
                        className="w-full bg-[#252836] border border-ura-border/75 rounded-lg px-3 py-2 text-white"
                      >
                        <option value="">Select a league</option>
                        {allLeagues.filter((l) => !creatorLeagues.some((c) => c.id === l.id)).map((l) => (
                          <option key={l.id} value={l.id}>{l.name}</option>
                        ))}
                      </select>
                    )}
                    <p className="text-xs text-gray-500 mt-1">Choose the league you want to challenge</p>
                  </div>
                </>
              )}
              <div>
                <label className="block text-sm text-gray-400 mb-1">Your stake (PEARLS)</label>
                <input type="text" value={inviteStake} onChange={(e) => setInviteStake(e.target.value.replace(/\D/g, ''))} placeholder={`${formatNumber(GLOBAL_TASK_MIN_STAKE)}–${formatNumber(GLOBAL_TASK_MAX_STAKE)}`} className="w-full bg-[#252836] border border-ura-border/75 rounded-lg px-3 py-2 text-white placeholder-gray-500" />
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={submitInvite} disabled={sending} className="flex-1 py-3 rounded-xl bg-ura-gold text-black font-bold disabled:opacity-50">{sending ? 'Sending…' : 'Send invite'}</button>
                <button type="button" onClick={() => setInviteTaskId(null)} className="px-4 py-3 rounded-xl bg-[#252836] text-gray-300">Cancel</button>
              </div>
            </div>
          ) : acceptChallengeId ? (
            <div className="space-y-3 py-2">
              <p className="text-white font-medium">Accept and stake to start</p>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Your stake (PEARLS)</label>
                <input type="text" value={acceptStake} onChange={(e) => setAcceptStake(e.target.value.replace(/\D/g, ''))} placeholder={`${formatNumber(GLOBAL_TASK_MIN_STAKE)}–${formatNumber(GLOBAL_TASK_MAX_STAKE)}`} className="w-full bg-[#252836] border border-ura-border/75 rounded-lg px-3 py-2 text-white placeholder-gray-500" />
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={submitAccept} disabled={accepting} className="flex-1 py-3 rounded-xl bg-ura-gold text-black font-bold disabled:opacity-50">{accepting ? 'Accepting…' : 'Accept'}</button>
                <button type="button" onClick={() => { setAcceptChallengeId(null); setAcceptStake(''); }} className="px-4 py-3 rounded-xl bg-[#252836] text-gray-300">Cancel</button>
              </div>
            </div>
          ) : tab === 'challenges' ? (
            challenges.length === 0 ? (
              <p className="text-gray-400 text-center py-8">No challenges. Send an invite from Browse.</p>
            ) : (
              <ul className="space-y-3 py-2">
                {challenges.map((c) => (
                  <li key={c.id} className="p-3 rounded-xl bg-[#252836] border border-ura-border/85">
                    <p className="font-medium text-white">{c.taskName}</p>
                    <p className="text-xs text-gray-400">{c.creatorName} vs {c.opponentName} · {c.targetLabel}</p>
                    <p className="text-xs text-gray-500 mt-1">Progress: {c.creatorProgress.toLocaleString()} vs {c.opponentProgress.toLocaleString()} · {c.status}</p>
                    {c.status === 'pending' && c.canAccept && (
                      <button type="button" onClick={() => { setAcceptChallengeId(c.id); setAcceptStake(''); }} className="mt-2 text-sm py-1.5 px-3 rounded-lg bg-ura-gold text-black font-medium">
                        Accept & stake
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )
          ) : templates.length === 0 ? (
            <p className="text-gray-400 text-center py-8">No competitions yet.</p>
          ) : (
            <ul className="space-y-3">
              {templates.map((t) => (
                <li key={t.id} className="p-3 rounded-xl bg-[#252836] border border-ura-border/85">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <p className="font-medium text-white">{t.name}</p>
                      <p className="text-xs text-gray-400">{t.targetLabel} · {t.durationDays} days · 30% bonus</p>
                    </div>
                    {(t.participantType === 'team' && creatorTeams.length > 0) || (t.participantType === 'league' && creatorLeagues.length > 0) ? (
                      <button type="button" onClick={() => openInvite(t)} className="shrink-0 text-sm py-1.5 px-3 rounded-lg bg-ura-gold text-black font-medium">Invite</button>
                    ) : (
                      <span className="text-xs text-gray-500">{t.participantType === 'team' ? 'Create a team' : 'Create a league'}</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}