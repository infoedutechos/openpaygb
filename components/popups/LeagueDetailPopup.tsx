'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { triggerHapticFeedback } from '@/utils/ui';
import { useToast } from '@/contexts/ToastContext';
import { formatNumber } from '@/utils/ui';
import { LEAGUE_POINTS } from '@/utils/consts';

interface LeagueDetailPopupProps {
  leagueId: string;
  onClose: () => void;
  initData: string;
  onCopyInvite?: (link: string) => void;
}

interface LeagueDetail {
  name: string;
  inviteCode: string;
  inviteLink: string | null;
  weekKey: string;
  memberCount: number;
  teamCount?: number;
  canCreateTask?: boolean;
  isCreator: boolean;
  pendingRequestsCount?: number;
  leaderboard: Array<{ rank: number; name: string; leaguePoints: number }>;
}

interface JoinRequest {
  id: string;
  userId: string;
  userName: string;
  createdAt: string;
}

export default function LeagueDetailPopup({ leagueId, onClose, initData, onCopyInvite }: LeagueDetailPopupProps) {
  const [data, setData] = useState<LeagueDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [denyRequestId, setDenyRequestId] = useState<string | null>(null);
  const [denyReason, setDenyReason] = useState('');
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const showToast = useToast();

  const fetchDetail = useCallback(async (): Promise<LeagueDetail | null> => {
    try {
      const res = await fetch(`/api/leagues/${leagueId}?initData=${encodeURIComponent(initData)}`);
      if (!res.ok) throw new Error('Failed to load');
      const json = await res.json();
      setData(json);
      return json;
    } catch {
      showToast('Could not load league', 'error');
      return null;
    } finally {
      setLoading(false);
    }
  }, [leagueId, initData, showToast]);

  useEffect(() => {
    setLoading(true);
    let cancelled = false;
    (async () => {
      const json = await fetchDetail();
      if (cancelled || !json?.isCreator) return;
      try {
        const r = await fetch(`/api/leagues/${leagueId}/requests?initData=${encodeURIComponent(initData)}`);
        if (r.ok) {
          const j = await r.json();
          if (!cancelled) setRequests(j.requests ?? []);
        }
      } catch {
        if (!cancelled) setRequests([]);
      }
    })();
    return () => { cancelled = true; };
  }, [leagueId, initData, fetchDetail]);

  const fetchRequests = useCallback(async () => {
    if (!data?.isCreator) return;
    try {
      const r = await fetch(`/api/leagues/${leagueId}/requests?initData=${encodeURIComponent(initData)}`);
      if (r.ok) {
        const j = await r.json();
        setRequests(j.requests ?? []);
      }
    } catch {
      setRequests([]);
    }
  }, [leagueId, initData, data?.isCreator]);

  const handleReview = async (requestId: string, action: 'approve' | 'deny') => {
    triggerHapticFeedback(window);
    const reason = action === 'deny' ? denyReason.trim() : undefined;
    setReviewingId(requestId);
    try {
      const res = await fetch(`/api/leagues/${leagueId}/requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData, requestId, action, denyReason: reason }),
      });
      const j = await res.json();
      if (!res.ok) {
        showToast(j.error || 'Failed', 'error');
        return;
      }
      showToast(action === 'approve' ? 'Request approved' : 'Request denied', 'success');
      setDenyRequestId(null);
      setDenyReason('');
      await fetchRequests();
      await fetchDetail();
    } catch {
      showToast('Failed', 'error');
    } finally {
      setReviewingId(null);
    }
  };

  const copyCode = () => {
    if (!data?.inviteCode) return;
    triggerHapticFeedback(window);
    navigator.clipboard.writeText(data.inviteCode);
    showToast('Invite code copied', 'success');
    onCopyInvite?.(data.inviteCode);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-ura-navy/60 p-0 sm:items-center sm:p-4">
        <div className="max-h-[90dvh] w-full max-w-xl overflow-hidden animate-slide-up rounded-t-3xl bg-ura-panel p-8 text-center text-gray-400 sm:rounded-2xl">Loading…</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-ura-navy/60 p-0 sm:items-center sm:p-4">
        <div className="max-h-[90dvh] w-full max-w-xl overflow-hidden animate-slide-up rounded-t-3xl bg-ura-panel p-8 text-center sm:rounded-2xl">
          <p className="text-gray-400 mb-4">League not found</p>
          <button type="button" onClick={() => { triggerHapticFeedback(window); onClose(); }} className="min-h-[44px] rounded-lg bg-ura-panel-2 px-4 py-2 text-white">Close</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ura-navy/60 p-0 sm:items-center sm:p-4">
      <div className="max-h-[90dvh] w-full max-w-xl flex flex-col overflow-hidden animate-slide-up rounded-t-3xl bg-ura-panel sm:max-h-[85vh] sm:rounded-2xl">
        <div className="px-4 py-3 flex justify-between items-center border-b border-ura-border/75 shrink-0">
          <h2 className="text-lg font-bold text-white">{data.name}</h2>
          <button type="button" onClick={() => { triggerHapticFeedback(window); onClose(); }} className="text-gray-400 hover:text-white text-2xl">&times;</button>
        </div>
        <div className="p-4 overflow-y-auto flex-1">
          <p className="text-gray-400 text-sm mb-2">Week {data.weekKey} · {data.memberCount} members{typeof data.teamCount === 'number' ? ` · ${data.teamCount} team(s)` : ''}</p>
          {typeof data.teamCount === 'number' && (
            <p className="text-gray-500 text-xs mb-2">League can create tasks: {data.canCreateTask ? 'Yes (2+ teams)' : 'No (need 2+ teams)'}</p>
          )}
          {data.isCreator && data.inviteCode && (
            <div className="flex gap-2 mb-4">
              <input type="text" readOnly value={data.inviteCode} className="flex-1 bg-ura-panel-2 border border-ura-border/75 rounded-lg px-3 py-2 text-white text-sm font-mono" />
              <button type="button" onClick={copyCode} className="py-2 px-3 rounded-lg bg-ura-gold text-black font-semibold text-sm">Copy code</button>
            </div>
          )}

          {data.isCreator && (
            <>
              <h3 className="text-[#f3ba2f] font-semibold mb-2">Join requests</h3>
              {requests.length === 0 ? (
                <p className="text-gray-400 text-sm mb-4">No pending requests.</p>
              ) : (
                <ul className="space-y-2 mb-4">
                  {requests.map((r) => (
                    <li key={r.id} className="flex flex-wrap items-center gap-2 py-2 border-b border-ura-border/85/50">
                      <span className="text-white flex-1 min-w-0 truncate">{r.userName}</span>
                      {denyRequestId === r.id ? (
                        <div className="w-full mt-2 flex flex-col gap-2">
                          <input
                            type="text"
                            placeholder="Reason for denial (optional)"
                            value={denyReason}
                            onChange={(e) => setDenyReason(e.target.value)}
                            className="w-full bg-ura-panel-2 border border-ura-border/75 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500"
                          />
                          <div className="flex gap-2">
                            <button
                              type="button"
                              disabled={reviewingId === r.id}
                              onClick={() => handleReview(r.id, 'deny')}
                              className="py-1.5 px-3 rounded-lg bg-rose-600 text-white text-sm font-medium"
                            >
                              {reviewingId === r.id ? '…' : 'Confirm deny'}
                            </button>
                            <button
                              type="button"
                              onClick={() => { setDenyRequestId(null); setDenyReason(''); }}
                              className="py-1.5 px-3 rounded-lg bg-ura-panel-2 text-gray-300 text-sm"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <button
                            type="button"
                            disabled={reviewingId === r.id}
                            onClick={() => handleReview(r.id, 'approve')}
                            className="py-1.5 px-3 rounded-lg bg-emerald-600 text-white text-sm font-medium disabled:opacity-50"
                          >
                            {reviewingId === r.id ? '…' : 'Approve'}
                          </button>
                          <button
                            type="button"
                            disabled={reviewingId === r.id}
                            onClick={() => setDenyRequestId(r.id)}
                            className="py-1.5 px-3 rounded-lg bg-rose-600/80 text-white text-sm font-medium disabled:opacity-50"
                          >
                            Deny
                          </button>
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}

          <h3 className="text-[#f3ba2f] font-semibold mb-2">Activities to participate in</h3>
          <p className="text-gray-400 text-sm mb-2">Earn LP for your league by doing these in the app:</p>
          <ul className="space-y-1.5 mb-4 text-sm">
            <li className="flex justify-between text-gray-300"><span>Daily login (Karibu Daily)</span><span className="text-[#f3ba2f] font-medium">{LEAGUE_POINTS.dailyLogin} LP</span></li>
            <li className="flex justify-between text-gray-300"><span>Complete a task (Earn tab)</span><span className="text-[#f3ba2f] font-medium">{LEAGUE_POINTS.taskComplete} LP</span></li>
            <li className="flex justify-between text-gray-300"><span>Attend X-Space (redeem code)</span><span className="text-[#f3ba2f] font-medium">{LEAGUE_POINTS.attendEvent} LP</span></li>
            <li className="flex justify-between text-gray-300"><span>Referral (friend joins)</span><span className="text-[#f3ba2f] font-medium">{LEAGUE_POINTS.referral} LP</span></li>
            <li className="flex justify-between text-gray-300"><span>Win challenge (Umeme Run / Lucky Spin)</span><span className="text-[#f3ba2f] font-medium">{LEAGUE_POINTS.miniGameWin} LP</span></li>
            <li className="flex justify-between text-gray-300"><span>Streak bonus (per day)</span><span className="text-[#f3ba2f] font-medium">{LEAGUE_POINTS.streakPerDay} LP</span></li>
          </ul>

          <h3 className="text-[#f3ba2f] font-semibold mb-2">Everyone&apos;s contribution</h3>
          <p className="text-gray-400 text-sm mb-2">League ranking by this week&apos;s LP.</p>
          <ul className="space-y-2">
            {data.leaderboard.map((row) => (
              <li key={row.rank} className="flex justify-between items-center py-2 border-b border-ura-border/85/50">
                <span className="text-gray-400 w-8">#{row.rank}</span>
                <span className="text-white flex-1 truncate ml-2">{row.name}</span>
                <span className="text-[#f3ba2f] font-medium">{formatNumber(row.leaguePoints)} LP</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
