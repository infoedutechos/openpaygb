'use client';

import React, { useState } from 'react';
import { triggerHapticFeedback } from '@/utils/ui';
import { useToast } from '@/contexts/ToastContext';

interface JoinTeamPopupProps {
  onClose: () => void;
  onJoin: (inviteCode: string) => Promise<boolean>;
  onSuccess: () => void;
  initialCode?: string;
}

export default function JoinTeamPopup({ onClose, onJoin, onSuccess, initialCode = '' }: JoinTeamPopupProps) {
  const [code, setCode] = useState(initialCode);
  const [submitting, setSubmitting] = useState(false);
  const showToast = useToast();

  const handleSubmit = async () => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) {
      showToast('Enter team invite code', 'error');
      return;
    }
    triggerHapticFeedback(window);
    setSubmitting(true);
    try {
      const ok = await onJoin(trimmed);
      if (ok) {
        showToast('Joined team!', 'success');
        onSuccess();
        onClose();
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ura-navy/60 p-0 sm:items-center sm:p-4">
      <div className="max-h-[90dvh] w-full max-w-xl flex flex-col overflow-hidden animate-slide-up rounded-t-3xl bg-ura-panel sm:max-h-[85vh] sm:rounded-2xl">
        <div className="px-4 py-3 flex justify-between items-center border-b border-ura-border/75">
          <h2 className="text-lg font-bold text-white">Join team</h2>
          <button type="button" onClick={() => { triggerHapticFeedback(window); onClose(); }} className="text-gray-400 hover:text-white text-2xl">&times;</button>
        </div>
        <div className="p-4 pb-8">
          <p className="text-sm text-gray-400 mb-2">No fee to join. Enter the team invite code from the person who created the team.</p>
          <label className="block text-sm text-gray-400 mb-2">Team invite code</label>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="e.g. ABC12XYZ"
            className="w-full bg-ura-panel-2 border border-ura-border/75 rounded-lg px-4 py-3 text-white placeholder-gray-500 uppercase"
            maxLength={12}
          />
          <div className="flex gap-3 mt-4">
            <button type="button" onClick={() => { triggerHapticFeedback(window); onClose(); }} className="flex-1 py-3 rounded-xl bg-ura-panel-2 text-gray-300 font-medium">Cancel</button>
            <button type="button" onClick={handleSubmit} disabled={submitting} className="flex-1 py-3 rounded-xl bg-ura-gold text-black font-bold disabled:opacity-50">{submitting ? 'Joining…' : 'Join'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
