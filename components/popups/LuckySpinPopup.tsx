'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useGameStore } from '@/utils/game-mechanics';
import { formatNumber, triggerHapticFeedback } from '@/utils/ui';
import { notifyPearlBalancesRefresh } from '@/utils/pearl-balance-events';
import { useToast } from '@/contexts/ToastContext';

interface LuckySpinPopupProps {
  onClose: () => void;
  onSuccess?: (points: number) => void;
  claimedToday?: boolean;
}

export default function LuckySpinPopup({ onClose, onSuccess, claimedToday }: LuckySpinPopupProps) {
  const { userTelegramInitData, incrementPoints, setPoints, setPointsBalance } = useGameStore();
  const [isSpinning, setIsSpinning] = useState(false);
  const [spinDegrees, setSpinDegrees] = useState(0);
  const [result, setResult] = useState<{ reward: number } | null>(null);
  const showToast = useToast();

  const handleSpin = async () => {
    if (!userTelegramInitData || claimedToday || isSpinning) return;
    triggerHapticFeedback(window);
    setIsSpinning(true);
    setResult(null);
    try {
      const res = await fetch('/api/mini-games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData: userTelegramInitData, miniGameId: 'lucky_spin' }),
      });
      const data = await res.json();
      if (data.error && data.claimed) {
        showToast('Already claimed today', 'success');
        onSuccess?.(0);
        onClose();
        return;
      }
      if (!res.ok) {
        showToast(data.error || 'Spin failed', 'error');
        return;
      }
      if (data.success && data.claimed) {
        const reward = data.reward ?? 0;
        setSpinDegrees((d) => d + 360 * 5 + Math.random() * 360);
        incrementPoints(reward);
        if (data.points != null) setPoints(data.points);
        if (data.pointsBalance != null) setPointsBalance(data.pointsBalance);
        notifyPearlBalancesRefresh();
        setTimeout(() => {
          setResult({ reward });
          showToast(`You won +${formatNumber(reward)} PEARLS!`, 'success');
          onSuccess?.(reward);
          setIsSpinning(false);
        }, 2500);
        return;
      }
    } catch {
      showToast('Network error', 'error');
    }
    setIsSpinning(false);
  };

  const handleClose = () => {
    triggerHapticFeedback(window);
    onClose();
  };

  const wheelSize = 500;

  return (
    <div className="fixed inset-0 flex flex-col min-h-screen min-h-dvh bg-[#0a0a0c] p-4 overflow-y-auto" style={{ zIndex: 99999 }}>
      {/* Title at top */}
      <div className="flex-shrink-0 pt-2 text-center">
        <h3 className="text-lg font-bold text-white">Lucky Spin</h3>
        <p className="text-gray-400 text-sm mt-1">Spin once per day for a random reward.</p>
      </div>
      {/* Arrow on top, wheel below it */}
      <div className="flex-1 flex flex-col items-center justify-center min-h-0 py-4">
        <div className="bg-ura-panel rounded-xl p-4 shadow-xl flex flex-col items-center">
          {/* Wheel – spins on Spin click */}
          <div
            className="transition-transform duration-[2500ms] ease-out"
            style={{ width: wheelSize, height: wheelSize, transform: `rotate(${spinDegrees}deg)` }}
          >
            <Image
              src="/lucky-spin-wheel2.png"
              alt="Spin wheel"
              width={wheelSize}
              height={wheelSize}
              className="w-full h-full object-contain"
              unoptimized
            />
          </div>
        </div>
      </div>
      {/* Win notification – prominent after rolling */}
      {result && (
        <div className="flex-shrink-0 text-center px-4 py-3 mb-1">
          <p className="text-xl font-bold text-[#f3ba2f]">You won +{formatNumber(result.reward)} PEARLS!</p>
          <p className="text-gray-400 text-sm mt-1">Added to your balance.</p>
        </div>
      )}
      {/* Result and buttons at bottom */}
      <div className="flex-shrink-0 w-full max-w-md mx-auto pb-2">
        {claimedToday ? (
          <p className="text-center text-gray-400 text-sm">Already claimed today. Come back tomorrow!</p>
        ) : null}
        <div className="mt-3 flex gap-2">
          {!result && (
            <button
              type="button"
              onClick={handleSpin}
              disabled={claimedToday || isSpinning}
              className="flex-1 py-2.5 px-4 rounded-lg bg-ura-gold text-black font-bold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSpinning ? 'Spinning…' : 'Spin'}
            </button>
          )}
          <button type="button" onClick={handleClose} className="py-2.5 px-4 rounded-lg bg-ura-panel-2 text-gray-300 font-medium">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
