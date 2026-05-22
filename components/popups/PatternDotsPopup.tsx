'use client';

import React, { useState, useCallback, useRef } from 'react';
import { useGameStore } from '@/utils/game-mechanics';
import { formatNumber, triggerHapticFeedback } from '@/utils/ui';
import { notifyPearlBalancesRefresh } from '@/utils/pearl-balance-events';
import { useToast } from '@/contexts/ToastContext';
import { MINI_GAMES, PATTERN_DOTS_REWARD, PATTERN_GRID_SIZE, PATTERN_MIN_DOTS, PATTERN_MAX_DOTS } from '@/utils/consts';

const GRID_COLS = 4;
const GRID_ROWS = 3;
const DOT_COUNT = PATTERN_GRID_SIZE; // 12
const DOT_SIZE = 28;
const GAP = 14;
const BOX_SIZE_W = DOT_SIZE * GRID_COLS + GAP * (GRID_COLS - 1);
const BOX_SIZE_H = DOT_SIZE * GRID_ROWS + GAP * (GRID_ROWS - 1);

/** Get (x, y) center of dot index (0–11, row-major 4x3). */
function dotCenter(index: number): { x: number; y: number } {
  const row = Math.floor(index / GRID_COLS);
  const col = index % GRID_COLS;
  return {
    x: GAP / 2 + col * (DOT_SIZE + GAP) + DOT_SIZE / 2,
    y: GAP / 2 + row * (DOT_SIZE + GAP) + DOT_SIZE / 2,
  };
}

/** Find which dot (0–11) is at position (px, py) in box coordinates, or -1. */
function hitTest(px: number, py: number): number {
  for (let i = 0; i < DOT_COUNT; i++) {
    const { x, y } = dotCenter(i);
    const dx = px - x;
    const dy = py - y;
    if (dx * dx + dy * dy <= (DOT_SIZE / 2 + 8) ** 2) return i;
  }
  return -1;
}

interface PatternDotsPopupProps {
  onClose: () => void;
  onSuccess?: () => void;
  claimedToday?: boolean;
  reward?: number; // today's reward from API
}

const config = MINI_GAMES.pattern_dots;

export default function PatternDotsPopup({ onClose, onSuccess, claimedToday, reward: rewardProp }: PatternDotsPopupProps) {
  const displayReward = rewardProp ?? PATTERN_DOTS_REWARD;
  const { userTelegramInitData, incrementPoints, setPoints, setPointsBalance } = useGameStore();
  const [path, setPath] = useState<number[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<'success' | 'wrong' | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const showToast = useToast();

  const getBoxCoords = useCallback((clientX: number, clientY: number) => {
    const box = boxRef.current;
    if (!box) return null;
    const rect = box.getBoundingClientRect();
    return { x: clientX - rect.left, y: clientY - rect.top };
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (claimedToday || result !== null) return;
      const coords = getBoxCoords(e.clientX, e.clientY);
      if (!coords) return;
      const index = hitTest(coords.x, coords.y);
      if (index >= 0) {
        triggerHapticFeedback(window);
        setPath([index]);
        setResult(null);
      }
    },
    [claimedToday, result, getBoxCoords]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (path.length === 0 || claimedToday || result !== null) return;
      const coords = getBoxCoords(e.clientX, e.clientY);
      if (!coords) return;
      const index = hitTest(coords.x, coords.y);
      if (index >= 0 && index !== path[path.length - 1]) {
        triggerHapticFeedback(window);
        setPath((p) => (p.includes(index) ? p : [...p, index]));
      }
    },
    [path, claimedToday, result, getBoxCoords]
  );

  const handlePointerUp = useCallback(() => {}, []);

  const handleClear = useCallback(() => {
    triggerHapticFeedback(window);
    setPath([]);
    setResult(null);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!userTelegramInitData || path.length < PATTERN_MIN_DOTS || path.length > PATTERN_MAX_DOTS || isSubmitting || claimedToday) return;
    triggerHapticFeedback(window);
    setIsSubmitting(true);
    setResult(null);
    try {
      const res = await fetch('/api/mini-games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          initData: userTelegramInitData,
          miniGameId: 'pattern_dots',
          pattern: path,
        }),
      });
      const data = await res.json();
      if (data.error && data.claimed) {
        showToast('Already claimed today', 'success');
        onSuccess?.();
        onClose();
        return;
      }
      if (data.success && data.claimed) {
        const awarded = data.reward ?? displayReward;
        incrementPoints(awarded);
        if (data.points != null) setPoints(data.points);
        if (data.pointsBalance != null) setPointsBalance(data.pointsBalance);
        setResult('success');
        showToast(`+${formatNumber(awarded)} PEARLS!`, 'success');
        notifyPearlBalancesRefresh();
        onSuccess?.();
        return;
      }
      setResult('wrong');
      showToast(data.message || 'Wrong pattern. Try again tomorrow.', 'error');
    } catch {
      showToast('Network error', 'error');
    } finally {
      setIsSubmitting(false);
    }
  }, [userTelegramInitData, path, isSubmitting, claimedToday, displayReward, onSuccess, onClose, showToast, incrementPoints, setPoints, setPointsBalance]);

  const handleClose = useCallback(() => {
    triggerHapticFeedback(window);
    onClose();
  }, [onClose]);

  return (
    <div className="fixed inset-0 flex flex-col min-h-screen min-h-dvh bg-[#0f1114] z-[99999]">
      <div className="flex-shrink-0 flex justify-between items-center p-4 border-b border-[#272a2f]">
        <div>
          <h2 className="text-xl font-bold text-white">{config.name}</h2>
          <p className="text-sm text-gray-400">Draw the correct pattern (4–12 dots). Reward: +{formatNumber(displayReward)} PEARLS once per day.</p>
        </div>
        <button onClick={handleClose} className="text-gray-400 hover:text-white text-2xl w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors" aria-label="Close">
          ×
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6 min-h-0">
        {claimedToday ? (
          <div className="text-center">
            <p className="text-emerald-400 font-semibold text-lg">Already claimed today!</p>
            <p className="text-gray-400 mt-2">Come back tomorrow for a new pattern.</p>
          </div>
        ) : result === 'success' ? (
          <div className="text-center">
            <p className="text-[#f3ba2f] font-bold text-2xl">Correct!</p>
            <p className="text-white text-lg mt-2">+{formatNumber(displayReward)} PEARLS</p>
          </div>
        ) : (
          <>
            <p className="text-gray-400 text-sm mb-4">Connect {PATTERN_MIN_DOTS}–{PATTERN_MAX_DOTS} dots in the correct order</p>
            <div
              ref={boxRef}
              className="relative select-none touch-none"
              style={{ width: BOX_SIZE_W, height: BOX_SIZE_H }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
            >
              {/* Lines between path dots */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ width: BOX_SIZE_W, height: BOX_SIZE_H }}>
                {path.length >= 2 && path.slice(0, -1).map((_, i) => {
                  const a = dotCenter(path[i]);
                  const b = dotCenter(path[i + 1]);
                  return (
                    <line
                      key={i}
                      x1={a.x}
                      y1={a.y}
                      x2={b.x}
                      y2={b.y}
                      stroke="#f3ba2f"
                      strokeWidth={4}
                      strokeLinecap="round"
                    />
                  );
                })}
              </svg>
              {/* Dots - positioned to match dotCenter() for hit test */}
              {Array.from({ length: DOT_COUNT }, (_, i) => {
                const { x, y } = dotCenter(i);
                const active = path.includes(i);
                return (
                  <div
                    key={i}
                    className="absolute rounded-full transition-all duration-150 pointer-events-none"
                    style={{
                      left: x - DOT_SIZE / 2,
                      top: y - DOT_SIZE / 2,
                      width: DOT_SIZE,
                      height: DOT_SIZE,
                      background: active ? '#f3ba2f' : 'rgba(61, 64, 70, 0.9)',
                      border: `2px solid ${active ? '#f3ba2f' : '#3d4046'}`,
                      boxShadow: active ? '0 0 12px rgba(243, 186, 47, 0.5)' : 'none',
                    }}
                  />
                );
              })}
            </div>

            <div className="flex items-center gap-3 mt-6">
              <button
                type="button"
                onClick={handleClear}
                className="px-5 py-2.5 rounded-xl bg-ura-panel-2 border border-ura-border/75 text-gray-300 font-medium hover:bg-[#3a3d42] transition-colors"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={path.length < PATTERN_MIN_DOTS || path.length > PATTERN_MAX_DOTS || isSubmitting}
                className="px-6 py-2.5 rounded-xl bg-ura-gold text-black font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#f4c141] transition-colors"
              >
                {isSubmitting ? 'Checking…' : `Submit (${path.length} dots)`}
              </button>
            </div>
            {result === 'wrong' && (
              <p className="text-rose-400 text-sm mt-3">Wrong pattern. A new pattern is available every day.</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
