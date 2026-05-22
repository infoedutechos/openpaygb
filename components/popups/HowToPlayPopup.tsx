'use client';

import React from 'react';
import { triggerHapticFeedback } from '@/utils/ui';

const SECTIONS = [
  { id: 'tap', label: 'Tap to Earn', icon: '💰', body: 'Tap to collect PEARLS. Use energy to tap; it refills over time. Keep tapping to earn more and progress.' },
  { id: 'earn', label: 'Earn & Boost', icon: '⛏️', body: 'Mine upgrades: Energy, Multi Tap, and more. Spend PEARLS in the Mine to earn more per tap and boost your hourly profit.' },
  { id: 'profit', label: 'Profit per Hour', icon: '⏰', body: 'Offline earnings up to 3 hours. Your Mine keeps producing PEARLS when you\'re away. Come back to collect and keep earning.' },
  { id: 'level', label: 'Level Up', icon: '📈', body: 'PEARLS and taps count toward your level and leaderboard rank. Level up to unlock better earning potential and climb the ranks.' },
  { id: 'friends', label: 'Friends', icon: '👥', body: 'Invite friends and earn referral bonuses. Share your link from the Friends tab; when they join, you both get rewards.' },
  { id: 'staking', label: 'Stake PEARLS', icon: '🪙', body: 'Lock PEARLS for at least 1 week. When the stake unlocks, claim your principal plus bonus. Stake from the Mine screen.' },
  { id: 'tasks', label: 'Tasks & Earn', icon: '📋', body: 'Earn tab tasks: videos, channels, Zoom code, and more. Complete tasks to earn PEARLS without tapping.' },
  { id: 'minigames', label: 'Mini Games', icon: '🎮', body: 'Umeme Run, Lucky Spin, and daily rewards. Play from the main screen to win extra PEARLS once per day per game.' },
  { id: 'rewards', label: 'Rewards', icon: '💸', body: 'Season rewards, Lumina ID, wallet and Drops. Stay active to qualify; connect your wallet when Lumina ID and Drops payments are available.' },
] as const;

interface HowToPlayPopupProps {
  onClose: () => void;
}

export default function HowToPlayPopup({ onClose }: HowToPlayPopupProps) {
  const handleClose = () => {
    triggerHapticFeedback(window);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-ura-navy/80 p-0 sm:items-center sm:p-4">
      <div
        className="flex h-[100dvh] max-h-[100dvh] w-full max-w-xl flex-col rounded-t-2xl bg-ura-panel shadow-xl sm:h-full sm:max-h-[90vh] sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-ura-border/75 shrink-0">
          <h2 className="text-lg font-bold text-white">How to play URAPearls</h2>
          <button
            type="button"
            onClick={handleClose}
            className="p-2 rounded-full text-gray-400 hover:text-white hover:bg-white/10"
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 px-4 py-4">
          {SECTIONS.map((section, index) => (
            <section key={section.id} className="mb-6 last:mb-0">
              <h3 className="text-[#f3ba2f] font-bold text-base mb-1.5">
                {index + 1}) {section.icon} {section.label}
              </h3>
              <p className="text-gray-300 text-sm leading-relaxed pl-0 whitespace-pre-line">
                {section.body}
              </p>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
