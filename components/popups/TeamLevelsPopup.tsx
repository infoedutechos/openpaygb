'use client';

import React from 'react';
import { triggerHapticFeedback } from '@/utils/ui';

interface TeamLevelsPopupProps {
  onClose: () => void;
}

export default function TeamLevelsPopup({ onClose }: TeamLevelsPopupProps) {
  const handleClose = () => {
    triggerHapticFeedback(window);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-ura-navy/60 p-0 sm:items-center sm:p-4">
      <div className="max-h-[90dvh] w-full max-w-xl flex flex-col overflow-hidden animate-slide-up rounded-t-3xl bg-ura-panel shadow-xl sm:max-h-[85vh] sm:animate-none sm:rounded-2xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-ura-border/75 shrink-0">
          <h2 className="text-lg font-bold text-white">Teams – how it works</h2>
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
            Teams do not have tiers like leagues. Anyone can create or join a team. Only teams can create leagues.
          </p>
          <ul className="space-y-3 text-sm text-gray-300">
            <li className="p-3 rounded-xl bg-[#252836] border border-ura-border/85">
              <strong className="text-white">Create team</strong> – 1,000,000 PEARLS commitment (team is lower rank than league). You get an invite code to share so others can join your team.
            </li>
            <li className="p-3 rounded-xl bg-[#252836] border border-ura-border/85">
              <strong className="text-white">Join team</strong> – Enter the team invite code (no fee). Get the code from the person who created the team, or use Browse teams to discover teams.
            </li>
            <li className="p-3 rounded-xl bg-[#252836] border border-ura-border/85">
              <strong className="text-white">Create league</strong> – Only a team can create a league (10M PEARLS). Create a team first, then use it to create a league.
            </li>
            <li className="p-3 rounded-xl bg-[#252836] border border-ura-border/85">
              <strong className="text-white">League levels</strong> – Leagues use tiers (Bronze to Legend). Tap &quot;League levels&quot; in the Leagues tab to see all tiers.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
