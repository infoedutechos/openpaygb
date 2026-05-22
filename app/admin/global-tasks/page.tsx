'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { formatNumber } from '@/utils/ui';

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
  globalTaskId: string;
  taskName: string;
  targetLabel: string;
  status: string;
  creatorName: string;
  opponentName: string;
  creatorTeamId: string | null;
  creatorLeagueId: string | null;
  opponentTeamId: string | null;
  opponentLeagueId: string | null;
  creatorStake: number;
  opponentStake: number;
  prizePool: number;
  managementBonusAmount: number;
  startedAt: string | null;
  endsAt: string | null;
  winnerTeamId: string | null;
  winnerLeagueId: string | null;
  redeemedAt: string | null;
  creatorProgress: number;
  opponentProgress: number;
}

interface Data {
  templates: Template[];
  challenges: Challenge[];
}

function GlobalTasksMainContent(props: {
  templates: Template[];
  challenges: Challenge[];
  message: { type: 'success' | 'error'; text: string } | null;
  actioningId: string | null;
  winnerSelect: Record<string, string>;
  onSeed: () => void;
  onFetchData: () => void;
  onSetWinner: (challengeId: string) => void;
  onRedeem: (challengeId: string) => void;
  onWinnerSelectChange: (challengeId: string, value: string) => void;
}) {
  const {
    templates,
    challenges,
    message,
    actioningId,
    winnerSelect,
    onSeed,
    onFetchData,
    onSetWinner,
    onRedeem,
    onWinnerSelectChange,
  } = props;

  return (
    <div className="min-h-screen bg-ura-panel text-white p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <Link href="/admin" className="text-[#f3ba2f] mb-2 inline-block">Back to Admin</Link>
            <h1 className="text-3xl font-bold text-[#f3ba2f]">Global Competitions</h1>
            <p className="text-gray-400 text-sm mt-1">
              Templates (10 team, 10 league). Invite-based challenges: set winner and redeem (30% management bonus). League winner = split among member teams.
            </p>
          </div>
          <div className="flex gap-2">
            {templates.length === 0 && (
              <button
                type="button"
                onClick={onSeed}
                disabled={!!actioningId}
                className="px-4 py-2 bg-ura-gold text-black rounded-lg font-medium disabled:opacity-50"
              >
                {actioningId === 'seed' ? 'Creating...' : 'Seed 20 templates'}
              </button>
            )}
            <button type="button" onClick={onFetchData} className="px-4 py-2 bg-ura-panel-2 hover:bg-[#3a3d42] rounded-lg text-sm">
              Refresh
            </button>
          </div>
        </div>

        {message && (
          <div className={'mb-4 p-3 rounded-lg ' + (message.type === 'success' ? 'bg-emerald-900/30 text-emerald-300' : 'bg-rose-900/30 text-rose-300')}>
            {message.text}
          </div>
        )}

        {templates.length === 0 && (
          <p className="text-gray-400 mb-6">No templates. Click &quot;Seed 20 templates&quot; to create 10 team + 10 league competitions.</p>
        )}

        {templates.length > 0 && (
          <section className="mb-8">
            <h2 className="text-xl font-bold text-white mb-3">Templates ({templates.length})</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
              {templates.map((t) => (
                <div key={t.id} className="bg-ura-panel-2 rounded-lg p-3 border border-ura-border/75">
                  <p className="font-medium text-white">{t.name}</p>
                  <p className="text-gray-400">{t.targetLabel} · {t.durationDays}d · {t.managementBonusPercent}% bonus</p>
                </div>
              ))}
            </div>
          </section>
        )}

        <section>
          <h2 className="text-xl font-bold text-white mb-3">Challenges</h2>
          {challenges.length === 0 ? (
            <p className="text-gray-400">No challenges yet. Users invite from app; when accepted, challenges appear here.</p>
          ) : (
            <div className="space-y-4">
              {challenges.map((c) => (
                <div key={c.id} className="bg-ura-panel-2 rounded-xl border border-ura-border/75 p-4">
                  <div className="flex flex-wrap justify-between gap-2 mb-2">
                    <div>
                      <p className="font-medium text-white">{c.taskName}</p>
                      <p className="text-sm text-gray-400">
                        {c.creatorName} vs {c.opponentName} · {c.targetLabel} · {c.status}
                      </p>
                    </div>
                    <div className="text-right text-sm">
                      <p>Prize: {formatNumber(c.prizePool)} PEARLS (incl. {formatNumber(c.managementBonusAmount)} 30% bonus)</p>
                      <p className="text-gray-400">Stakes: {formatNumber(c.creatorStake)} + {formatNumber(c.opponentStake)}</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mb-2">
                    Progress: creator {c.creatorProgress.toLocaleString()} · opponent {c.opponentProgress.toLocaleString()}
                    {c.endsAt ? ' · Ends ' + new Date(c.endsAt).toLocaleString() : ''}
                  </p>
                  {c.status === 'active' && (
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <select
                        value={winnerSelect[c.id] ?? ''}
                        onChange={(e) => onWinnerSelectChange(c.id, e.target.value)}
                        className="bg-ura-panel-2 border border-ura-border/75 rounded-lg px-3 py-2 text-white text-sm"
                      >
                        <option value="">Select winner...</option>
                        {c.creatorTeamId && (
                          <option value={'team:' + c.creatorTeamId}>{c.creatorName} (creator)</option>
                        )}
                        {c.creatorLeagueId && (
                          <option value={'league:' + c.creatorLeagueId}>{c.creatorName} (creator)</option>
                        )}
                        {c.opponentTeamId && (
                          <option value={'team:' + c.opponentTeamId}>{c.opponentName} (opponent)</option>
                        )}
                        {c.opponentLeagueId && (
                          <option value={'league:' + c.opponentLeagueId}>{c.opponentName} (opponent)</option>
                        )}
                      </select>
                      <button
                        type="button"
                        onClick={() => onSetWinner(c.id)}
                        disabled={!!actioningId || !winnerSelect[c.id]}
                        className="px-3 py-2 bg-amber-600 rounded-lg text-sm font-medium disabled:opacity-50"
                      >
                        Set winner
                      </button>
                    </div>
                  )}
                  {c.status === 'completed' && !c.redeemedAt && (
                    <div className="mt-2">
                      <button
                        type="button"
                        onClick={() => onRedeem(c.id)}
                        disabled={!!actioningId}
                        className="px-3 py-2 bg-emerald-600 rounded-lg text-sm font-medium disabled:opacity-50"
                      >
                        Redeem ({formatNumber(c.prizePool)} PEARLS)
                      </button>
                    </div>
                  )}
                  {c.redeemedAt && <p className="mt-2 text-sm text-emerald-400">Redeemed {new Date(c.redeemedAt).toLocaleString()}</p>}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default function AdminGlobalTasksPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [sectionPasswordRequired, setSectionPasswordRequired] = useState(false);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [winnerSelect, setWinnerSelect] = useState<Record<string, string>>({});

  const fetchData = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    setSectionPasswordRequired(false);
    try {
      const res = await fetch('/api/admin/global-tasks', { credentials: 'include', cache: 'no-store' });
      const data: Data = await res.json();
      if (!res.ok) {
        if (res.status === 403 && (data as { code?: string }).code === 'ITEM_REQUIRED') {
          setSectionPasswordRequired(true);
        } else {
          setMessage({ type: 'error', text: (data as { error?: string }).error || 'Failed to load' });
        }
        setTemplates([]);
        setChallenges([]);
        return;
      }
      setTemplates(data.templates ?? []);
      setChallenges(data.challenges ?? []);
    } catch {
      setMessage({ type: 'error', text: 'Failed to load' });
      setTemplates([]);
      setChallenges([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const seed = async () => {
    setActioningId('seed');
    try {
      const res = await fetch('/api/admin/global-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'seed' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Seed failed');
      setMessage({ type: 'success', text: data.message || 'Templates created' });
      fetchData();
    } catch (e) {
      setMessage({ type: 'error', text: e instanceof Error ? e.message : 'Seed failed' });
    } finally {
      setActioningId(null);
    }
  };

  const setWinner = async (challengeId: string) => {
    const value = winnerSelect[challengeId];
    if (!value) {
      setMessage({ type: 'error', text: 'Select a winner' });
      return;
    }
    const [type, id] = value.split(':');
    setActioningId(challengeId);
    try {
      const res = await fetch('/api/admin/global-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action: 'setWinner',
          challengeId,
          winnerTeamId: type === 'team' ? id : undefined,
          winnerLeagueId: type === 'league' ? id : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setMessage({ type: 'success', text: data.message || 'Winner set' });
      setWinnerSelect((s) => ({ ...s, [challengeId]: '' }));
      fetchData();
    } catch (e) {
      setMessage({ type: 'error', text: e instanceof Error ? e.message : 'Failed' });
    } finally {
      setActioningId(null);
    }
  };

  const redeem = async (challengeId: string) => {
    setActioningId(challengeId);
    try {
      const res = await fetch('/api/admin/global-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'redeem', challengeId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Redeem failed');
      setMessage({ type: 'success', text: data.message || 'Prize paid' });
      fetchData();
    } catch (e) {
      setMessage({ type: 'error', text: e instanceof Error ? e.message : 'Redeem failed' });
    } finally {
      setActioningId(null);
    }
  };

  const setWinnerSelectValue = useCallback((challengeId: string, value: string) => {
    setWinnerSelect((s) => ({ ...s, [challengeId]: value }));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-ura-panel text-white p-8">
        <div className="max-w-5xl mx-auto">
          <Link href="/admin" className="text-[#f3ba2f] mb-4 inline-block">Back to Admin</Link>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (sectionPasswordRequired) {
    return (
      <div className="min-h-screen bg-ura-panel text-white p-8">
        <div className="max-w-5xl mx-auto">
          <Link href="/admin" className="text-[#f3ba2f] mb-4 inline-block">Back to Admin</Link>
          <p className="text-amber-400 mb-2">Section password required.</p>
        </div>
      </div>
    );
  }

  return (
    <GlobalTasksMainContent
      templates={templates}
      challenges={challenges}
      message={message}
      actioningId={actioningId}
      winnerSelect={winnerSelect}
      onSeed={seed}
      onFetchData={fetchData}
      onSetWinner={setWinner}
      onRedeem={redeem}
      onWinnerSelectChange={setWinnerSelectValue}
    />
  );
}
