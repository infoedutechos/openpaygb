'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { triggerHapticFeedback } from '@/utils/ui';
import { useToast } from '@/contexts/ToastContext';
import { formatNumber } from '@/utils/ui';
import { TERMS_AGREEMENT_LABEL_MEMBER } from '@/utils/teams-leagues-terms';

interface LeagueListPopupProps {
  onClose: () => void;
  initData: string;
  onOpenLeague?: (leagueId: string) => void;
}

interface LeagueItem {
  id: string;
  name: string;
  memberCount: number;
  maxMembers: number;
  totalLP: number;
  status?: 'creator' | 'member' | 'pending';
}

interface MyRequest {
  id: string;
  leagueId: string;
  leagueName: string;
  status: string;
  denyReason?: string;
  createdAt: string;
}

export default function LeagueListPopup({ onClose, initData, onOpenLeague }: LeagueListPopupProps) {
  const [leagues, setLeagues] = useState<LeagueItem[]>([]);
  const [myRequests, setMyRequests] = useState<MyRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [requestingId, setRequestingId] = useState<string | null>(null);
  const [confirmRequestLeagueId, setConfirmRequestLeagueId] = useState<string | null>(null);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const showToast = useToast();

  const fetchList = useCallback(async () => {
    try {
      const [listRes, myRes] = await Promise.all([
        fetch(`/api/leagues/list?initData=${encodeURIComponent(initData)}`),
        fetch(`/api/leagues/my-requests?initData=${encodeURIComponent(initData)}`),
      ]);
      if (listRes.ok) {
        const json = await listRes.json();
        setLeagues(json.leagues ?? []);
      }
      if (myRes.ok) {
        const j = await myRes.json();
        setMyRequests(j.requests ?? []);
      }
    } catch {
      showToast('Could not load leagues', 'error');
      setLeagues([]);
    } finally {
      setLoading(false);
    }
  }, [initData, showToast]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const openRequestConfirm = (leagueId: string) => {
    setConfirmRequestLeagueId(leagueId);
    setAgreedToTerms(false);
  };

  const handleRequestJoin = async (leagueId: string) => {
    if (!agreedToTerms) {
      showToast('You must agree to the Teams & Leagues Terms to request to join.', 'error');
      return;
    }
    triggerHapticFeedback(window);
    setConfirmRequestLeagueId(null);
    setRequestingId(leagueId);
    try {
      const res = await fetch('/api/leagues/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData, leagueId, agreedToTerms: true }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Request failed', 'error');
        return;
      }
      showToast('Request sent. Creator will approve or deny.', 'success');
      fetchList();
    } catch {
      showToast('Request failed', 'error');
    } finally {
      setRequestingId(null);
    }
  };

  const handleRowClick = (item: LeagueItem) => {
    if (item.status === 'member' || item.status === 'creator') {
      triggerHapticFeedback(window);
      onOpenLeague?.(item.id);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-ura-navy/60 p-0 sm:items-center sm:p-4">
      <div className="max-h-[90dvh] w-full max-w-xl flex flex-col overflow-hidden animate-slide-up rounded-t-3xl bg-ura-panel shadow-xl sm:max-h-[85vh] sm:animate-none sm:rounded-2xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-ura-border/75 shrink-0">
          <h2 className="text-lg font-bold text-white">Browse leagues</h2>
          <button
            type="button"
            onClick={() => { triggerHapticFeedback(window); onClose(); }}
            className="p-2 rounded-full text-gray-400 hover:text-white hover:bg-white/10 text-2xl"
            aria-label="Close"
          >
            &times;
          </button>
        </div>
        {confirmRequestLeagueId && (
          <div className="p-4 border-b border-ura-border/75 bg-[#252836] shrink-0">
            <p className="text-sm text-gray-300 mb-2">By requesting to join you agree to the Teams &amp; Leagues Terms.</p>
            <label className="flex items-start gap-2 cursor-pointer mb-3">
              <input
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="mt-1 rounded border-ura-border/75 bg-ura-panel-2 text-[#f3ba2f] focus:ring-[#f3ba2f]"
              />
              <span className="text-sm text-gray-300">{TERMS_AGREEMENT_LABEL_MEMBER}</span>
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { triggerHapticFeedback(window); setConfirmRequestLeagueId(null); }}
                className="flex-1 py-2 rounded-lg bg-ura-panel-2 text-gray-300 text-sm font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={requestingId === confirmRequestLeagueId || !agreedToTerms}
                onClick={() => confirmRequestLeagueId && handleRequestJoin(confirmRequestLeagueId)}
                className="flex-1 py-2 rounded-lg bg-ura-gold text-black text-sm font-semibold disabled:opacity-50"
              >
                {requestingId === confirmRequestLeagueId ? 'Sending…' : 'Send request'}
              </button>
            </div>
          </div>
        )}
        <div className="flex-1 overflow-y-auto p-4">
          {myRequests.length > 0 && (
            <div className="mb-4 p-3 rounded-xl bg-ura-panel-2 border border-ura-border/75">
              <p className="text-xs font-semibold text-gray-400 mb-2">My requests</p>
              <ul className="space-y-1.5">
                {myRequests.slice(0, 10).map((r) => (
                  <li key={r.id} className="text-sm flex flex-wrap items-center gap-1">
                    <span className="text-white truncate">{r.leagueName}</span>
                    <span className={
                      r.status === 'pending' ? 'text-amber-400' :
                      r.status === 'approved' ? 'text-emerald-400' : 'text-rose-400'
                    }>
                      {r.status === 'pending' ? 'Pending' : r.status === 'approved' ? 'Approved' : 'Denied'}
                    </span>
                    {r.status === 'denied' && r.denyReason && (
                      <span className="text-gray-400 text-xs w-full">— {r.denyReason}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {loading ? (
            <p className="text-gray-400 text-center py-8">Loading…</p>
          ) : leagues.length === 0 ? (
            <p className="text-gray-400 text-center py-8">No leagues yet. Create one or ask friends for an invite code.</p>
          ) : (
            <ul className="space-y-2">
              {leagues.map((item) => (
                <li
                  key={item.id}
                  className={`rounded-xl border bg-[#252836] overflow-hidden ${(item.status === 'member' || item.status === 'creator') ? 'border-ura-border/75 cursor-pointer hover:border-[#f3ba2f]/40' : 'border-ura-border/85'}`}
                >
                  <div
                    className="p-3 flex flex-wrap items-center gap-2"
                    onClick={() => handleRowClick(item)}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-white truncate">{item.name}</p>
                      <p className="text-xs text-gray-400">
                        {formatNumber(item.totalLP)} LP this week · {item.memberCount} / {item.maxMembers} members
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {item.status === 'creator' && (
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-amber-500/20 text-amber-300">Creator</span>
                      )}
                      {item.status === 'member' && (
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-emerald-500/20 text-emerald-300">Joined</span>
                      )}
                      {item.status === 'pending' && (
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-500/20 text-gray-400">Pending</span>
                      )}
                      {                      (!item.status || (item.status !== 'creator' && item.status !== 'member' && item.status !== 'pending')) && (
                        <button
                          type="button"
                          disabled={requestingId === item.id || item.memberCount >= item.maxMembers}
                          onClick={(e) => { e.stopPropagation(); openRequestConfirm(item.id); }}
                          className="py-1.5 px-3 rounded-lg bg-ura-gold text-black font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {requestingId === item.id ? 'Sending…' : 'Request to join'}
                        </button>
                      )}
                    </div>
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
