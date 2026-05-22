'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { triggerHapticFeedback } from '@/utils/ui';
import { useToast } from '@/contexts/ToastContext';
import { TERMS_AGREEMENT_LABEL_MEMBER } from '@/utils/teams-leagues-terms';

interface BrowseTeamsPopupProps {
  onClose: () => void;
  initData: string | null;
  onOpenJoinTeam?: () => void;
}

interface TeamRow {
  id: string;
  name: string;
  memberCount: number;
  maxMembers?: number;
  isMember: boolean;
  requestStatus: string | null;
}

export default function BrowseTeamsPopup({ onClose, initData, onOpenJoinTeam }: BrowseTeamsPopupProps) {
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [requestingId, setRequestingId] = useState<string | null>(null);
  const [confirmRequestTeamId, setConfirmRequestTeamId] = useState<string | null>(null);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const showToast = useToast();

  const fetchTeams = useCallback(async () => {
    try {
      const url = initData ? `/api/teams/list?initData=${encodeURIComponent(initData)}` : '/api/teams/list';
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      setTeams(data.teams ?? []);
    } catch {
      showToast('Could not load teams', 'error');
      setTeams([]);
    } finally {
      setLoading(false);
    }
  }, [initData, showToast]);

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  const openRequestConfirm = useCallback((teamId: string) => {
    setConfirmRequestTeamId(teamId);
    setAgreedToTerms(false);
  }, []);

  const handleRequestJoin = useCallback(async (teamId: string) => {
    if (!initData) {
      showToast('Session required', 'error');
      return;
    }
    if (!agreedToTerms) {
      showToast('You must agree to the Teams & Leagues Terms to request to join.', 'error');
      return;
    }
    setConfirmRequestTeamId(null);
    setRequestingId(teamId);
    try {
      const res = await fetch('/api/teams/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData, teamId, agreedToTerms: true }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(data.error || 'Request failed', 'error');
        return;
      }
      showToast('Join request sent', 'success');
      fetchTeams();
    } catch {
      showToast('Request failed', 'error');
    } finally {
      setRequestingId(null);
    }
  }, [initData, agreedToTerms, showToast, fetchTeams]);

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-ura-navy/60 p-0 sm:items-center sm:p-4">
      <div className="max-h-[90dvh] w-full max-w-xl flex flex-col overflow-hidden animate-slide-up rounded-t-3xl bg-ura-panel shadow-xl sm:max-h-[85vh] sm:animate-none sm:rounded-2xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-ura-border/75 shrink-0">
          <h2 className="text-lg font-bold text-white">Browse teams</h2>
          <button type="button" onClick={() => { triggerHapticFeedback(window); onClose(); }} className="p-2 rounded-full text-gray-400 hover:text-white text-2xl">&times;</button>
        </div>
        <div className="p-4 flex flex-col gap-3 shrink-0">
          <p className="text-sm text-gray-400">Teams you can join. To join a team, get the invite code from the team creator and use <strong className="text-white">Join team</strong>.</p>
          {onOpenJoinTeam && (
            <button type="button" onClick={() => { triggerHapticFeedback(window); onClose(); onOpenJoinTeam(); }} className="w-full py-3 rounded-xl bg-ura-gold text-black font-bold">
              Join team (enter code)
            </button>
          )}
        </div>
        {confirmRequestTeamId && (
          <div className="p-4 border-t border-ura-border/75 bg-[#252836]">
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
                onClick={() => { triggerHapticFeedback(window); setConfirmRequestTeamId(null); }}
                className="flex-1 py-2 rounded-lg bg-ura-panel-2 text-gray-300 text-sm font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={requestingId === confirmRequestTeamId || !agreedToTerms}
                onClick={() => confirmRequestTeamId && handleRequestJoin(confirmRequestTeamId)}
                className="flex-1 py-2 rounded-lg bg-ura-gold text-black text-sm font-semibold disabled:opacity-50"
              >
                {requestingId === confirmRequestTeamId ? 'Sending…' : 'Send request'}
              </button>
            </div>
          </div>
        )}
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {loading ? (
            <p className="text-gray-400 text-center py-8">Loading…</p>
          ) : teams.length === 0 ? (
            <p className="text-gray-400 text-center py-8">No teams yet. Create one to get started.</p>
          ) : (
            <ul className="space-y-2">
              {teams.map((t) => (
                <li key={t.id} className="p-3 rounded-xl bg-[#252836] border border-ura-border/85">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium text-white">{t.name}</p>
                      <p className="text-xs text-gray-400">{(t.memberCount + 1)}/{t.maxMembers ?? 7} members{t.isMember ? ' · You are a member' : ''}</p>
                    </div>
                    {!t.isMember && (
                      t.requestStatus === 'pending' ? (
                        <span className="text-xs text-amber-400">Pending</span>
                      ) : (t.memberCount + 1) >= (t.maxMembers ?? 7) ? (
                        <span className="text-xs text-gray-500">Full</span>
                      ) : (
                        <button
                          type="button"
                          disabled={!initData || requestingId === t.id}
                          onClick={() => { triggerHapticFeedback(window); openRequestConfirm(t.id); }}
                          className="text-sm py-1.5 px-3 rounded-lg bg-ura-gold text-black font-medium disabled:opacity-50"
                        >
                          {requestingId === t.id ? '…' : 'Request to join'}
                        </button>
                      )
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
