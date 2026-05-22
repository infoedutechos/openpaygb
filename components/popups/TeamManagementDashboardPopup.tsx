'use client';

/**
 * Team Management Dashboard – owner only. Opens widely (full-screen feel).
 * Members: list, remove, mute, ban, punish. Communicate: announcements. Opinions: create, list (for/against).
 */

import React, { useState, useEffect, useCallback } from 'react';
import { triggerHapticFeedback } from '@/utils/ui';
import { useToast } from '@/contexts/ToastContext';

interface Member {
  userId: string;
  name: string;
  isOwner: boolean;
  joinedAt: string;
  mutedUntil: string | null;
  banned: boolean;
  punishmentNote: string | null;
}

interface Announcement {
  id: string;
  text: string;
  authorName: string;
  createdAt: string;
}

interface Opinion {
  id: string;
  title: string;
  body: string | null;
  authorName: string;
  createdAt: string;
  votesFor: number;
  votesAgainst: number;
}

interface TeamManagementDashboardPopupProps {
  teamId: string;
  teamName: string;
  onClose: () => void;
  initData: string;
  onSuccess?: () => void;
}

interface JoinRequest {
  id: string;
  userId: string;
  userName: string;
  createdAt: string;
}

interface JoinableChallenge {
  id: string;
  taskName: string;
  targetLabel: string;
  status: string;
  creatorName: string;
  opponentName: string;
  creatorTeamId: string | null;
  opponentTeamId: string | null;
  creatorLeagueId: string | null;
  opponentLeagueId: string | null;
  creatorProgress: number;
  opponentProgress: number;
  prizePool: number;
  endsAt: string | null;
  winnerTeamId: string | null;
  winnerLeagueId: string | null;
  isMineCreator: boolean;
  isMineOpponent: boolean;
  canAccept: boolean;
}

type Tab = 'members' | 'requests' | 'communicate' | 'opinions' | 'challenges';

export default function TeamManagementDashboardPopup({ teamId, teamName, onClose, initData, onSuccess }: TeamManagementDashboardPopupProps) {
  const [tab, setTab] = useState<Tab>('members');
  const [loading, setLoading] = useState(true);
  const [team, setTeam] = useState<{ id: string; name: string; inviteCode: string } | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [opinions, setOpinions] = useState<Opinion[]>([]);
  const [announcementText, setAnnouncementText] = useState('');
  const [opinionTitle, setOpinionTitle] = useState('');
  const [opinionBody, setOpinionBody] = useState('');
  const [posting, setPosting] = useState(false);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [punishUserId, setPunishUserId] = useState<string | null>(null);
  const [punishNote, setPunishNote] = useState('');
  const [joinableChallenges, setJoinableChallenges] = useState<JoinableChallenge[]>([]);
  const [challengesLoading, setChallengesLoading] = useState(false);
  const showToast = useToast();

  const fetchData = useCallback(async () => {
    try {
      const [manageRes, requestsRes] = await Promise.all([
        fetch(`/api/teams/${teamId}/manage?initData=${encodeURIComponent(initData)}`),
        fetch(`/api/teams/${teamId}/requests?initData=${encodeURIComponent(initData)}`),
      ]);
      if (!manageRes.ok) {
        const j = await manageRes.json().catch(() => ({}));
        throw new Error(j.error || 'Failed to load');
      }
      const data = await manageRes.json();
      setTeam(data.team);
      setMembers(data.members ?? []);
      setAnnouncements(data.announcements ?? []);
      setOpinions(data.opinions ?? []);
      if (requestsRes.ok) {
        const reqData = await requestsRes.json();
        setJoinRequests(reqData.requests ?? []);
      }
    } catch (e) {
      showToast((e as Error).message || 'Could not load dashboard', 'error');
      onClose();
    } finally {
      setLoading(false);
    }
  }, [teamId, initData, showToast, onClose]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const fetchChallenges = useCallback(async () => {
    setChallengesLoading(true);
    try {
      const res = await fetch(`/api/global-tasks/challenges?initData=${encodeURIComponent(initData)}`);
      if (!res.ok) return setJoinableChallenges([]);
      const data = await res.json();
      const list = (data.challenges ?? []).filter(
        (c: JoinableChallenge) => c.creatorTeamId === teamId || c.opponentTeamId === teamId
      );
      setJoinableChallenges(list);
    } catch {
      setJoinableChallenges([]);
    } finally {
      setChallengesLoading(false);
    }
  }, [initData, teamId]);

  useEffect(() => {
    if (tab === 'challenges') fetchChallenges();
  }, [tab, fetchChallenges]);

  const runAction = async (action: string, payload: Record<string, unknown>) => {
    triggerHapticFeedback(window);
    setActioningId(payload.userId as string ?? '');
    try {
      const res = await fetch(`/api/teams/${teamId}/manage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData, action, ...payload }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      showToast(data.message || 'Done', 'success');
      setPunishUserId(null);
      setPunishNote('');
      fetchData();
      onSuccess?.();
    } catch (e) {
      showToast((e as Error).message || 'Failed', 'error');
    } finally {
      setActioningId(null);
    }
  };

  const postAnnouncement = async () => {
    if (!announcementText.trim()) return;
    triggerHapticFeedback(window);
    setPosting(true);
    try {
      const res = await fetch(`/api/teams/${teamId}/manage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData, action: 'postAnnouncement', text: announcementText.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      showToast('Announcement posted', 'success');
      setAnnouncementText('');
      fetchData();
      onSuccess?.();
    } catch (e) {
      showToast((e as Error).message || 'Failed', 'error');
    } finally {
      setPosting(false);
    }
  };

  const createOpinion = async () => {
    if (!opinionTitle.trim()) return;
    triggerHapticFeedback(window);
    setPosting(true);
    try {
      const res = await fetch(`/api/teams/${teamId}/manage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData, action: 'createOpinion', title: opinionTitle.trim(), body: opinionBody.trim() || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      showToast('Opinion created', 'success');
      setOpinionTitle('');
      setOpinionBody('');
      fetchData();
      onSuccess?.();
    } catch (e) {
      showToast((e as Error).message || 'Failed', 'error');
    } finally {
      setPosting(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-[60] flex items-end justify-center bg-ura-navy/80 p-0 sm:items-center sm:p-4">
        <div className="text-white text-lg">Loading dashboard…</div>
      </div>
    );
  }

  const reviewRequest = async (requestId: string, action: 'approve' | 'deny', denyReason?: string) => {
    triggerHapticFeedback(window);
    setActioningId(requestId);
    try {
      const res = await fetch(`/api/teams/${teamId}/requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData, requestId, action, denyReason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      showToast(action === 'approve' ? 'Request approved' : 'Request denied', 'success');
      setJoinRequests((prev) => prev.filter((r) => r.id !== requestId));
      fetchData();
      onSuccess?.();
    } catch (e) {
      showToast((e as Error).message || 'Failed', 'error');
    } finally {
      setActioningId(null);
    }
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: 'members', label: 'Members' },
    { id: 'requests', label: 'Requests' },
    { id: 'challenges', label: 'Challenges' },
    { id: 'communicate', label: 'Communicate' },
    { id: 'opinions', label: 'Opinions' },
  ];

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-ura-navy-deep/90 min-h-[100dvh]">
      <header className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-ura-border/85 bg-ura-panel-2">
        <div>
          <h1 className="text-lg font-bold text-white">Team: {team?.name ?? teamName}</h1>
          <p className="text-xs text-gray-400">Management dashboard</p>
        </div>
        <button type="button" onClick={() => { triggerHapticFeedback(window); onClose(); }} className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-ura-panel-2">
          <span className="text-2xl">&times;</span>
        </button>
      </header>

      <div className="flex border-b border-ura-border/85 px-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => { triggerHapticFeedback(window); setTab(t.id); }}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition ${tab === t.id ? 'border-sky-500 text-sky-400' : 'border-transparent text-gray-400 hover:text-white'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {tab === 'members' && (
          <div className="space-y-3">
            {team?.inviteCode && (
              <div className="rounded-xl bg-ura-panel-2 border border-ura-border/85 p-3 mb-3">
                <p className="text-xs text-gray-400 mb-1">Invite code (share to add members)</p>
                <p className="font-mono text-white font-medium">{team.inviteCode}</p>
              </div>
            )}
            <p className="text-gray-400 text-sm">Manage members: remove, mute, ban, or add a note.</p>
            <ul className="space-y-2">
              {members.map((m) => (
                <li key={m.userId} className="rounded-xl bg-ura-panel-2 border border-ura-border/85 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="text-white font-medium">{m.name}</span>
                      {m.isOwner && <span className="ml-2 text-xs text-amber-400">Owner</span>}
                      {m.banned && <span className="ml-2 text-xs text-rose-400">Banned</span>}
                      {m.mutedUntil && new Date(m.mutedUntil) > new Date() && <span className="ml-2 text-xs text-amber-400">Muted</span>}
                      {m.punishmentNote && <p className="text-xs text-gray-500 mt-1">Note: {m.punishmentNote}</p>}
                    </div>
                    {!m.isOwner && (
                      <div className="flex flex-wrap gap-1.5">
                        <button type="button" onClick={() => runAction('removeMember', { userId: m.userId })} disabled={!!actioningId} className="px-2 py-1 rounded bg-rose-600/80 text-white text-xs font-medium disabled:opacity-50">Remove</button>
                        <button type="button" onClick={() => runAction('muteMember', { userId: m.userId })} disabled={!!actioningId} className="px-2 py-1 rounded bg-amber-600/80 text-white text-xs font-medium disabled:opacity-50">Mute 24h</button>
                        {m.banned ? (
                          <button type="button" onClick={() => runAction('unbanMember', { userId: m.userId })} disabled={!!actioningId} className="px-2 py-1 rounded bg-emerald-600/80 text-white text-xs font-medium disabled:opacity-50">Unban</button>
                        ) : (
                          <button type="button" onClick={() => runAction('banMember', { userId: m.userId })} disabled={!!actioningId} className="px-2 py-1 rounded bg-rose-700 text-white text-xs font-medium disabled:opacity-50">Ban</button>
                        )}
                        {punishUserId === m.userId ? (
                          <div className="flex flex-col gap-1 w-full mt-2">
                            <input type="text" placeholder="Note (reason)" value={punishNote} onChange={(e) => setPunishNote(e.target.value)} className="w-full bg-ura-panel-2 border border-ura-border/75 rounded px-2 py-1 text-white text-sm" />
                            <div className="flex gap-1">
                              <button type="button" onClick={() => runAction('punishMember', { userId: m.userId, punishmentNote: punishNote })} disabled={!!actioningId} className="px-2 py-1 rounded bg-ura-gold text-black text-xs font-medium">Save note</button>
                              <button type="button" onClick={() => { setPunishUserId(null); setPunishNote(''); }} className="px-2 py-1 rounded bg-ura-panel-2 text-gray-300 text-xs">Cancel</button>
                            </div>
                          </div>
                        ) : (
                          <button type="button" onClick={() => setPunishUserId(m.userId)} className="px-2 py-1 rounded bg-ura-panel-2 text-gray-300 text-xs">Note</button>
                        )}
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {tab === 'challenges' && (
          <div className="space-y-3">
            <p className="text-gray-400 text-sm">Joinable task invites and progress for this team. Pending = waiting for opponent to accept. Active = race in progress. Completed = result and performance.</p>
            {challengesLoading ? (
              <p className="text-gray-500 text-sm">Loading challenges…</p>
            ) : joinableChallenges.length === 0 ? (
              <p className="text-gray-500 text-sm">No joinable challenges for this team yet. Send an invite from Earn → Joinable tasks.</p>
            ) : (
              <ul className="space-y-3">
                {joinableChallenges.map((c) => (
                  <li key={c.id} className="rounded-xl bg-ura-panel-2 border border-ura-border/85 p-3">
                    <div className="flex justify-between items-start gap-2">
                      <p className="font-medium text-white text-sm">{c.taskName}</p>
                      <span className={`shrink-0 text-xs px-2 py-0.5 rounded ${c.status === 'pending' ? 'bg-amber-500/20 text-amber-300' : c.status === 'active' ? 'bg-sky-500/20 text-sky-300' : 'bg-emerald-500/20 text-emerald-300'}`}>
                        {c.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{c.creatorName} vs {c.opponentName} · {c.targetLabel}</p>
                    {c.status === 'pending' && (
                      <p className="text-xs text-amber-200/90 mt-2">
                        {c.isMineCreator ? 'Invite sent. Opponent can accept in Joinable tasks.' : c.canAccept ? 'You can accept & stake in Joinable tasks.' : 'Waiting for opponent.'}
                      </p>
                    )}
                    {(c.status === 'active' || c.status === 'completed') && (
                      <div className="mt-2 pt-2 border-t border-ura-border/85">
                        <p className="text-xs text-gray-400">Progress (since start): <span className="text-sky-300">{c.creatorProgress.toLocaleString()}</span> vs <span className="text-amber-300">{c.opponentProgress.toLocaleString()}</span></p>
                        {c.endsAt && <p className="text-xs text-gray-500 mt-0.5">Ends: {new Date(c.endsAt).toLocaleString()}</p>}
                        {c.status === 'completed' && (c.winnerTeamId || c.winnerLeagueId) && (
                          <p className="text-xs text-emerald-400 mt-1">Winner decided · Prize pool: {c.prizePool?.toLocaleString() ?? '—'} PEARLS</p>
                        )}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {tab === 'requests' && (
          <div className="space-y-3">
            <p className="text-gray-400 text-sm">Join requests: approve or deny.</p>
            {joinRequests.length === 0 ? (
              <p className="text-gray-500 text-sm">No pending requests.</p>
            ) : (
              <ul className="space-y-2">
                {joinRequests.map((r) => (
                  <li key={r.id} className="rounded-xl bg-ura-panel-2 border border-ura-border/85 p-3 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="text-white font-medium">{r.userName}</span>
                      <p className="text-xs text-gray-500 mt-0.5">{new Date(r.createdAt).toLocaleString()}</p>
                    </div>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => reviewRequest(r.id, 'approve')} disabled={!!actioningId} className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-sm font-medium disabled:opacity-50">Approve</button>
                      <button type="button" onClick={() => reviewRequest(r.id, 'deny')} disabled={!!actioningId} className="px-3 py-1.5 rounded-lg bg-rose-600 text-white text-sm font-medium disabled:opacity-50">Deny</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {tab === 'communicate' && (
          <div className="space-y-4">
            <div className="rounded-xl bg-ura-panel-2 border border-ura-border/85 p-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">Post announcement to all members</label>
              <textarea value={announcementText} onChange={(e) => setAnnouncementText(e.target.value)} placeholder="Write your message…" rows={3} className="w-full bg-ura-panel-2 border border-ura-border/75 rounded-lg px-3 py-2 text-white placeholder-gray-500 text-sm resize-none" />
              <button type="button" onClick={postAnnouncement} disabled={posting || !announcementText.trim()} className="mt-2 px-4 py-2 rounded-lg bg-sky-600 text-white font-medium text-sm disabled:opacity-50">Post</button>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-300 mb-2">Recent announcements</h3>
              {announcements.length === 0 ? <p className="text-gray-500 text-sm">No announcements yet.</p> : (
                <ul className="space-y-2">
                  {announcements.slice(0, 20).map((a) => (
                    <li key={a.id} className="rounded-lg bg-ura-panel-2 border border-ura-border/85 p-3">
                      <p className="text-white text-sm">{a.text}</p>
                      <p className="text-xs text-gray-500 mt-1">{a.authorName} · {new Date(a.createdAt).toLocaleString()}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {tab === 'opinions' && (
          <div className="space-y-4">
            <div className="rounded-xl bg-ura-panel-2 border border-ura-border/85 p-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">Raise an opinion (proposal for the team)</label>
              <input type="text" value={opinionTitle} onChange={(e) => setOpinionTitle(e.target.value)} placeholder="Title" className="w-full bg-ura-panel-2 border border-ura-border/75 rounded-lg px-3 py-2 text-white placeholder-gray-500 text-sm mb-2" />
              <textarea value={opinionBody} onChange={(e) => setOpinionBody(e.target.value)} placeholder="Description (optional)" rows={2} className="w-full bg-ura-panel-2 border border-ura-border/75 rounded-lg px-3 py-2 text-white placeholder-gray-500 text-sm resize-none" />
              <button type="button" onClick={createOpinion} disabled={posting || !opinionTitle.trim()} className="mt-2 px-4 py-2 rounded-lg bg-amber-600 text-white font-medium text-sm disabled:opacity-50">Create opinion</button>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-300 mb-2">Opinions (members vote For / Against)</h3>
              {opinions.length === 0 ? <p className="text-gray-500 text-sm">No opinions yet.</p> : (
                <ul className="space-y-2">
                  {opinions.map((o) => (
                    <li key={o.id} className="rounded-lg bg-ura-panel-2 border border-ura-border/85 p-3">
                      <p className="text-white font-medium text-sm">{o.title}</p>
                      {o.body && <p className="text-gray-400 text-xs mt-1">{o.body}</p>}
                      <p className="text-xs text-gray-500 mt-1">{o.authorName} · {new Date(o.createdAt).toLocaleString()}</p>
                      <p className="text-xs text-emerald-400 mt-1">For: {o.votesFor} · Against: {o.votesAgainst}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
