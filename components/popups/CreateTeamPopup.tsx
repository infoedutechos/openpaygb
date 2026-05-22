'use client';

import React, { useState } from 'react';
import { triggerHapticFeedback } from '@/utils/ui';
import { useToast } from '@/contexts/ToastContext';
import { formatNumber } from '@/utils/ui';
import { TEAM_CREATION_FEE, TEAM_MIN_MEMBERS, TEAM_MAX_MEMBERS } from '@/utils/consts';
import { TERMS_AGREEMENT_LABEL_CREATOR } from '@/utils/teams-leagues-terms';

interface CreateTeamPopupProps {
  onClose: () => void;
  onCreate: (name: string, agreedToTerms: boolean) => Promise<{ id: string; inviteCode: string; name: string } | null>;
  onSuccess: () => void;
  userBalance?: number;
}

export default function CreateTeamPopup({ onClose, onCreate, onSuccess, userBalance }: CreateTeamPopupProps) {
  const [name, setName] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState<{ inviteCode: string; name: string } | null>(null);
  const showToast = useToast();
  const canAfford = userBalance == null || userBalance >= TEAM_CREATION_FEE;

  const handleSubmit = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      showToast('Enter a team name', 'error');
      return;
    }
    if (!canAfford) {
      showToast(`Commitment is ${formatNumber(TEAM_CREATION_FEE)} PEARLS. Your balance is insufficient.`, 'error');
      return;
    }
    if (!agreedToTerms) {
      showToast('You must agree to the Teams & Leagues Terms to create a team.', 'error');
      return;
    }
    triggerHapticFeedback(window);
    setSubmitting(true);
    try {
      const result = await onCreate(trimmed, true);
      if (result) {
        setCreated({ inviteCode: result.inviteCode, name: result.name });
        onSuccess();
      }
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to create team', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const copyCode = () => {
    if (!created?.inviteCode) return;
    triggerHapticFeedback(window);
    navigator.clipboard.writeText(created.inviteCode);
    showToast('Code copied', 'success');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ura-navy/60 p-0 sm:items-center sm:p-4">
      <div className="max-h-[90dvh] w-full max-w-xl flex flex-col overflow-hidden animate-slide-up rounded-t-3xl bg-ura-panel sm:max-h-[85vh] sm:rounded-2xl">
        <div className="px-4 py-3 flex justify-between items-center border-b border-ura-border/75">
          <h2 className="text-lg font-bold text-white">Create team</h2>
          <button type="button" onClick={() => { triggerHapticFeedback(window); onClose(); }} className="text-gray-400 hover:text-white text-2xl">&times;</button>
        </div>
        <div className="p-4 pb-8">
          {!created ? (
            <>
              <p className="text-sm text-amber-200/90 mb-3">
                Commitment: <strong className="text-white">{formatNumber(TEAM_CREATION_FEE)} PEARLS</strong> (1M PEARLS; transferred to fees). Team size: {TEAM_MIN_MEMBERS}–{TEAM_MAX_MEMBERS} members. Only teams can create leagues (10M PEARLS).
              </p>
              {userBalance != null && (
                <p className="text-sm text-gray-400 mb-2">Your balance: {formatNumber(Math.floor(userBalance))} PEARLS</p>
              )}
              <label className="block text-sm text-gray-400 mb-2">Team name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Alpha Squad"
                className="w-full bg-ura-panel-2 border border-ura-border/75 rounded-lg px-4 py-3 text-white placeholder-gray-500"
                maxLength={80}
              />
              <label className="flex items-start gap-2 mt-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="mt-1 rounded border-ura-border/75 bg-ura-panel-2 text-[#f3ba2f] focus:ring-[#f3ba2f]"
                />
                <span className="text-sm text-gray-300">{TERMS_AGREEMENT_LABEL_CREATOR}</span>
              </label>
              <div className="flex gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => { triggerHapticFeedback(window); onClose(); }}
                  className="flex-1 py-3 rounded-xl bg-ura-panel-2 text-gray-300 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting || !canAfford || !agreedToTerms}
                  className="flex-1 py-3 rounded-xl bg-ura-gold text-black font-bold disabled:opacity-50"
                >
                  {submitting ? 'Creating…' : 'Create'}
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="text-emerald-400 font-medium mb-2">Team &quot;{created.name}&quot; created</p>
              <p className="text-sm text-gray-400 mb-2">Share this code so others can join your team:</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={created.inviteCode}
                  className="flex-1 bg-ura-panel-2 border border-ura-border/75 rounded-lg px-4 py-3 text-white text-lg font-mono tracking-wider"
                />
                <button
                  type="button"
                  onClick={copyCode}
                  className="py-3 px-4 rounded-lg bg-ura-gold text-black font-semibold"
                >
                  Copy
                </button>
              </div>
              <button
                type="button"
                onClick={() => { triggerHapticFeedback(window); onClose(); }}
                className="w-full mt-4 py-3 rounded-xl bg-ura-panel-2 text-white font-medium"
              >
                Done
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
