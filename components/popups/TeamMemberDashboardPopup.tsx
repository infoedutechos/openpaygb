'use client';

/**
 * Team Member Dashboard – for users who joined a team (not owner).
 * Tracks: overview (progress summary), announcements, communications (opinions), members (TP/LP), tasks/challenges.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { triggerHapticFeedback } from '@/utils/ui';
import { useToast } from '@/contexts/ToastContext';
import { formatNumber } from '@/utils/ui';

interface TeamMemberDashboardPopupProps {
  teamId: string;
  teamName: string;
  onClose: () => void;
  initData: string;
}

interface Overview {
  memberCount: number;
  totalTP: number;
  totalLP: number;
  announcementsCount: number;
  opinionsCount: number;
  tasksAvailableCount: number;
  tasksCompletedCount: number;
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

interface MemberRow {
  userId: string;
  name: string;
  isOwner: boolean;
  totalTP: number;
  totalLP: number;
  weekTP: number;
  weekLP: number;
}

interface TaskItem {
  id: string;
  status?: string;
  targetAlm: number;
  durationDays?: number;
  prizePool: number;
  creatorTeamName: string;
  opponentTeamName: string | null;
  startsAt: string | null;
  endsAt: string | null;
  winnerTeamId: string | null;
}

interface TaskCompleted {
  id: string;
  targetAlm: number;
  prizePool: number;
  creatorTeamName: string;
  opponentTeamName: string | null;
  winnerTeamId: string | null;
  endsAt: string | null;
}

type Tab = 'overview' | 'announcements' | 'communications' | 'members' | 'tasks';

export default function TeamMemberDashboardPopup({ teamId, teamName, onClose, initData }: TeamMemberDashboardPopupProps) {
  const [tab, setTab] = useState<Tab>('overview');
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [opinions, setOpinions] = useState<Opinion[]>([]);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [tasksAvailable, setTasksAvailable] = useState<TaskItem[]>([]);
  const [tasksCompleted, setTasksCompleted] = useState<TaskCompleted[]>([]);
  const showToast = useToast();

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/teams/${teamId}/member-dashboard?initData=${encodeURIComponent(initData)}`);
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || 'Failed to load');
      }
      const data = await res.json();
      setOverview(data.overview ?? null);
      setAnnouncements(data.announcements ?? []);
      setOpinions(data.opinions ?? []);
      setMembers(data.members ?? []);
      setTasksAvailable(data.tasksAvailable ?? []);
      setTasksCompleted(data.tasksCompleted ?? []);
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

  if (loading) {
    return (
      <div className="fixed inset-0 z-[60] flex items-end justify-center bg-ura-navy/80 p-0 sm:items-center sm:p-4">
        <div className="text-white text-lg">Loading dashboard…</div>
      </div>
    );
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'announcements', label: 'Announcements' },
    { id: 'communications', label: 'Communications' },
    { id: 'members', label: 'Members' },
    { id: 'tasks', label: 'Tasks' },
  ];

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-ura-navy-deep/90 min-h-[100dvh]">
      <header className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-ura-border/85 bg-ura-panel-2">
        <div>
          <h1 className="text-lg font-bold text-white">Team: {teamName}</h1>
          <p className="text-xs text-gray-400">Member dashboard</p>
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
        {tab === 'overview' && (
          <div className="space-y-4">
            <p className="text-gray-400 text-sm">Team progress and activity at a glance.</p>
            {overview && (
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-ura-panel-2 border border-ura-border/85 p-3">
                  <p className="text-xs text-gray-500">Members</p>
                  <p className="text-xl font-bold text-white">{overview.memberCount}</p>
                </div>
                <div className="rounded-xl bg-ura-panel-2 border border-ura-border/85 p-3">
                  <p className="text-xs text-gray-500">Total TP</p>
                  <p className="text-xl font-bold text-sky-400">{formatNumber(overview.totalTP)}</p>
                </div>
                <div className="rounded-xl bg-ura-panel-2 border border-ura-border/85 p-3">
                  <p className="text-xs text-gray-500">Total LP</p>
                  <p className="text-xl font-bold text-amber-400">{formatNumber(overview.totalLP)}</p>
                </div>
                <div className="rounded-xl bg-ura-panel-2 border border-ura-border/85 p-3">
                  <p className="text-xs text-gray-500">Announcements</p>
                  <p className="text-xl font-bold text-white">{overview.announcementsCount}</p>
                </div>
                <div className="rounded-xl bg-ura-panel-2 border border-ura-border/85 p-3">
                  <p className="text-xs text-gray-500">Opinions / polls</p>
                  <p className="text-xl font-bold text-white">{overview.opinionsCount}</p>
                </div>
                <div className="rounded-xl bg-ura-panel-2 border border-ura-border/85 p-3">
                  <p className="text-xs text-gray-500">Tasks (active / done)</p>
                  <p className="text-xl font-bold text-white">{overview.tasksAvailableCount} / {overview.tasksCompletedCount}</p>
                </div>
              </div>
            )}
            {announcements.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-300 mb-2">Latest announcement</h3>
                <div className="rounded-xl bg-ura-panel-2 border border-ura-border/85 p-3">
                  <p className="text-white text-sm line-clamp-2">{announcements[0].text}</p>
                  <p className="text-xs text-gray-500 mt-1">{announcements[0].authorName} · {new Date(announcements[0].createdAt).toLocaleString()}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'announcements' && (
          <div className="space-y-3">
            <p className="text-gray-400 text-sm">Announcements from your team owner.</p>
            {announcements.length === 0 ? (
              <p className="text-gray-500 text-sm">No announcements yet.</p>
            ) : (
              <ul className="space-y-2">
                {announcements.map((a) => (
                  <li key={a.id} className="rounded-xl bg-ura-panel-2 border border-ura-border/85 p-3">
                    <p className="text-white text-sm">{a.text}</p>
                    <p className="text-xs text-gray-500 mt-1">{a.authorName} · {new Date(a.createdAt).toLocaleString()}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {tab === 'communications' && (
          <div className="space-y-3">
            <p className="text-gray-400 text-sm">Opinions and proposals from teammates (vote For / Against in management if you’re owner; as member you can view).</p>
            {opinions.length === 0 ? (
              <p className="text-gray-500 text-sm">No opinions yet.</p>
            ) : (
              <ul className="space-y-2">
                {opinions.map((o) => (
                  <li key={o.id} className="rounded-xl bg-ura-panel-2 border border-ura-border/85 p-3">
                    <p className="text-white font-medium text-sm">{o.title}</p>
                    {o.body && <p className="text-gray-400 text-xs mt-1">{o.body}</p>}
                    <p className="text-xs text-gray-500 mt-1">{o.authorName} · {new Date(o.createdAt).toLocaleString()}</p>
                    <p className="text-xs text-emerald-400 mt-1">For: {o.votesFor} · Against: {o.votesAgainst}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {tab === 'members' && (
          <div className="space-y-3">
            <p className="text-gray-400 text-sm">Team members with total TP/LP and this week.</p>
            <ul className="space-y-2">
              {members.map((m) => (
                <li key={m.userId} className="rounded-xl bg-ura-panel-2 border border-ura-border/85 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-white font-medium">{m.name}</span>
                    {m.isOwner && <span className="text-xs text-amber-400">Owner</span>}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-3 text-xs">
                    <span className="text-gray-400">TP: <span className="text-white">{formatNumber(m.totalTP)}</span> {m.weekTP > 0 && <span className="text-amber-400">({m.weekTP} this week)</span>}</span>
                    <span className="text-gray-400">LP: <span className="text-white">{formatNumber(m.totalLP)}</span> {m.weekLP > 0 && <span className="text-amber-400">({m.weekLP} this week)</span>}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {tab === 'tasks' && (
          <div className="space-y-4">
            <section>
              <h3 className="text-sm font-semibold text-gray-300 mb-2">Available (team challenges)</h3>
              {tasksAvailable.length === 0 ? (
                <p className="text-gray-500 text-sm">No active or pending challenges.</p>
              ) : (
                <ul className="space-y-2">
                  {tasksAvailable.map((c) => (
                    <li key={c.id} className="rounded-xl bg-ura-panel-2 border border-ura-border/85 p-3">
                      <p className="text-white text-sm font-medium">{c.creatorTeamName} vs {c.opponentTeamName ?? 'TBD'}</p>
                      <p className="text-xs text-gray-400 mt-1">Target: {formatNumber(c.targetAlm)} PEARLS · Prize: {formatNumber(c.prizePool)} PEARLS · Status: {c.status}</p>
                      {c.endsAt && <p className="text-xs text-gray-500 mt-0.5">Ends: {new Date(c.endsAt).toLocaleString()}</p>}
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <section>
              <h3 className="text-sm font-semibold text-gray-300 mb-2">Completed</h3>
              {tasksCompleted.length === 0 ? (
                <p className="text-gray-500 text-sm">No completed challenges yet.</p>
              ) : (
                <ul className="space-y-2">
                  {tasksCompleted.map((c) => (
                    <li key={c.id} className="rounded-xl bg-ura-panel-2 border border-ura-border/85 p-3">
                      <p className="text-white text-sm font-medium">{c.creatorTeamName} vs {c.opponentTeamName ?? '—'}</p>
                      <p className="text-xs text-gray-400 mt-1">Target: {formatNumber(c.targetAlm)} PEARLS · Prize: {formatNumber(c.prizePool)} PEARLS</p>
                      {c.endsAt && <p className="text-xs text-gray-500 mt-0.5">Ended: {new Date(c.endsAt).toLocaleString()}</p>}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
