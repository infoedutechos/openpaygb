// components/popups/DailyCipherPopup.tsx

/**
 * Daily Cipher - Morse code puzzle of the day
 * Tap = dot (·), Hold = dash (–), Space = next letter
 */

'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import IceCube from '@/icons/IceCube';
import { useGameStore } from '@/utils/game-mechanics';
import { formatNumber, triggerHapticFeedback } from '@/utils/ui';
import { notifyPearlBalancesRefresh } from '@/utils/pearl-balance-events';
import { useToast } from '@/contexts/ToastContext';
import { dailyCipher } from '@/images';
import { DAILY_CIPHER_MAX_ATTEMPTS } from '@/utils/consts';

const HOLD_THRESHOLD_MS = 250;

interface DailyCipherPopupProps {
  onClose: () => void;
}

export default function DailyCipherPopup({ onClose }: DailyCipherPopupProps) {
  const { userTelegramInitData, incrementPoints, setPoints, setPointsBalance } = useGameStore();
  const [status, setStatus] = useState<{
    hint: string;
    attemptsLeft: number;
    claimed: boolean;
    reward: number;
  } | null>(null);
  const [pattern, setPattern] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pressStartRef = useRef<number>(0);
  const showToast = useToast();

  const fetchStatus = useCallback(async () => {
    if (!userTelegramInitData) return;
    try {
      const res = await fetch(
        `/api/daily-cipher?initData=${encodeURIComponent(userTelegramInitData)}`
      );
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      setStatus(data);
    } catch {
      setStatus(null);
    } finally {
      setIsLoading(false);
    }
  }, [userTelegramInitData]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handlePointerDown = useCallback(() => {
    triggerHapticFeedback(window);
    pressStartRef.current = Date.now();
    holdTimerRef.current = setTimeout(() => {
      holdTimerRef.current = null; // Mark as "long hold" so pointer up won't add dot
      setPattern((p) => p + '-');
      triggerHapticFeedback(window);
    }, HOLD_THRESHOLD_MS);
  }, []);

  const handlePointerUp = useCallback(() => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
      setPattern((p) => p + '.');
    }
  }, []);

  const handleSpace = useCallback(() => {
    triggerHapticFeedback(window);
    setPattern((p) => (p.endsWith(' ') ? p : p + ' '));
  }, []);

  const handleBackspace = useCallback(() => {
    triggerHapticFeedback(window);
    setPattern((p) => {
      if (p.endsWith(' ')) return p.slice(0, -1);
      return p.slice(0, -1);
    });
  }, []);

  const handleSubmit = async () => {
    if (!userTelegramInitData || !status || status.claimed || status.attemptsLeft <= 0 || isSubmitting) return;
    if (!pattern.trim()) {
      showToast('Enter a pattern (tap=dot, hold=dash)', 'error');
      return;
    }
    setIsSubmitting(true);
    triggerHapticFeedback(window);
    try {
      const res = await fetch('/api/daily-cipher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData: userTelegramInitData, pattern }),
      });
      const data = await res.json();
      if (data.success && data.claimed) {
        incrementPoints(data.reward);
        if (data.points != null) setPoints(data.points);
        if (data.pointsBalance != null) setPointsBalance(data.pointsBalance);
        setStatus((s) => s ? { ...s, claimed: true, attemptsLeft: 0 } : s);
        showToast(data.message || `+${formatNumber(data.reward)} PEARLS!`, 'success');
        notifyPearlBalancesRefresh();
        setPattern('');
      } else {
        setStatus((s) => s ? { ...s, attemptsLeft: data.attemptsLeft ?? s.attemptsLeft } : s);
        showToast(data.message || data.error || 'Wrong code', data.success ? 'success' : 'error');
        setPattern('');
      }
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    triggerHapticFeedback(window);
    setIsClosing(true);
    setTimeout(onClose, 280);
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-ura-navy/60 p-0 sm:items-center sm:p-4">
        <div className="flex min-h-[320px] max-h-[90dvh] w-full max-w-xl items-center justify-center rounded-t-3xl bg-ura-panel p-6 sm:rounded-2xl">
          <div className="w-10 h-10 border-2 border-[#f3ba2f] border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ura-navy/60 p-0 sm:items-center sm:p-4">
      <div
        className={`max-h-[90dvh] w-full max-w-xl flex flex-col overflow-hidden rounded-t-3xl bg-ura-panel sm:max-h-[85vh] sm:rounded-2xl ${isClosing ? 'animate-slide-down' : 'animate-slide-up'}`}
      >
        <div className="bg-gradient-to-b from-[#2a2d33] to-[#1d2025] px-5 pt-6 pb-4 flex justify-between items-start">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-ura-panel-2 flex items-center justify-center ring-2 ring-cyan-500/40">
              <Image src={dailyCipher} alt="Decode" width={28} height={28} className="rounded" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Decode</h2>
              <p className="text-sm text-gray-400">Tap = dot · &nbsp; Hold = dash –</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white text-2xl w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10"
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        <div className="px-4 pb-8 pt-2">
          <div className="bg-ura-panel-2 rounded-xl p-4 mb-4">
            <p className="text-gray-400 text-sm mb-1">Hint</p>
            <p className="text-white font-medium">{status?.hint ?? '—'}</p>
            <div className="flex justify-between items-center mt-2 text-sm">
              <span className="text-amber-400">Attempts left: {status?.attemptsLeft ?? 0}/{DAILY_CIPHER_MAX_ATTEMPTS}</span>
              <span className="text-cyan-400 flex items-center gap-1">
                <IceCube className="w-4 h-4" />
                +{formatNumber(status?.reward ?? 50000)}
              </span>
            </div>
          </div>

          {status?.claimed ? (
            <div className="text-center py-6 text-emerald-400 font-medium">
              You solved it today! Come back tomorrow for a new puzzle.
            </div>
          ) : status && status.attemptsLeft <= 0 ? (
            <div className="text-center py-6 text-amber-400 font-medium">
              No attempts left. Come back tomorrow!
            </div>
          ) : (
            <>
              <div className="bg-ura-panel rounded-xl p-4 mb-4 min-h-[60px] border border-ura-border/75">
                <p className="text-gray-500 text-xs mb-1">Your pattern</p>
                <p className="text-2xl font-mono text-cyan-300 break-all">
                  {pattern || '—'}
                </p>
              </div>

              <div className="flex flex-col gap-3 mb-4">
                <button
                  onPointerDown={handlePointerDown}
                  onPointerUp={handlePointerUp}
                  onPointerLeave={handlePointerUp}
                  onContextMenu={(e) => e.preventDefault()}
                  className="w-full py-6 rounded-xl bg-gradient-to-b from-cyan-500/30 to-cyan-600/20 border-2 border-cyan-500/50 text-white font-bold text-lg active:scale-[0.98] select-none touch-none"
                >
                  TAP (short) or HOLD (long)
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={handleSpace}
                    disabled={isSubmitting}
                    className="flex-1 py-3 rounded-xl bg-ura-panel-2 border border-ura-border/75 text-gray-300 font-medium disabled:opacity-50"
                  >
                    Space (next letter)
                  </button>
                  <button
                    onClick={handleBackspace}
                    disabled={isSubmitting}
                    className="px-4 py-3 rounded-xl bg-ura-panel-2 border border-ura-border/75 text-gray-300 disabled:opacity-50"
                  >
                    ⌫
                  </button>
                </div>
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting || !pattern.trim()}
                  className="w-full py-4 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 text-black font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <span className="inline-block w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  ) : (
                    'Submit'
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
