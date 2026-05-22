'use client';

import React from 'react';
import { triggerHapticFeedback } from '@/utils/ui';
import { LEAGUE_TIERS } from '@/utils/consts';

const TIER_INFO: Record<string, { desc: string; color: string }> = {
  Bronze: { desc: 'Entry level; everyone starts here.', color: 'text-amber-200' },
  Silver: { desc: 'Promoted from Bronze; better rewards.', color: 'text-gray-300' },
  Gold: { desc: 'Competitive; higher LP rewards.', color: 'text-amber-400' },
  Platinum: { desc: 'Advanced; reward multipliers.', color: 'text-cyan-300' },
  Diamond: { desc: 'Elite; limited slots; special rewards.', color: 'text-blue-300' },
  Legend: { desc: 'Top players; biggest rewards and recognition.', color: 'text-[#f3ba2f]' },
};

interface LeagueLevelsPopupProps {
  onClose: () => void;
}

export default function LeagueLevelsPopup({ onClose }: LeagueLevelsPopupProps) {
  const handleClose = () => {
    triggerHapticFeedback(window);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-ura-navy/60 p-0 sm:items-center sm:p-4">
      <div className="max-h-[90dvh] w-full max-w-xl flex flex-col overflow-hidden animate-slide-up rounded-t-3xl bg-ura-panel shadow-xl sm:max-h-[85vh] sm:animate-none sm:rounded-2xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-ura-border/75 shrink-0">
          <h2 className="text-lg font-bold text-white">All league levels</h2>
          <button
            type="button"
            onClick={handleClose}
            className="p-2 rounded-full text-gray-400 hover:text-white hover:bg-white/10 text-2xl"
            aria-label="Close"
          >
            &times;
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <p className="text-gray-400 text-sm mb-4">
            Six tiers from entry to elite. Top performers get promoted each week; bottom get demoted.
          </p>
          <ol className="space-y-3">
            {LEAGUE_TIERS.map((tier, i) => {
              const info = TIER_INFO[tier] ?? { desc: '', color: 'text-gray-300' };
              return (
                <li
                  key={tier}
                  className="flex gap-3 p-3 rounded-xl bg-[#252836] border border-ura-border/85"
                >
                  <span className="flex-shrink-0 w-8 h-8 rounded-lg bg-ura-panel flex items-center justify-center text-gray-500 font-bold">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className={`font-bold ${info.color}`}>{tier}</p>
                    <p className="text-sm text-gray-400 mt-0.5">{info.desc}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </div>
  );
}
