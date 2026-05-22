// components/popups/TapChallengePopup.tsx

/**
 * Tap Challenge (Umeme Run) - tap 18 times in 3 seconds
 * 3 trials per day, persisted; claim only on success; retry on fail
 */

'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import IceCube from '@/icons/IceCube';
import { useGameStore } from '@/utils/game-mechanics';
import { formatNumber, triggerHapticFeedback } from '@/utils/ui';
import { notifyPearlBalancesRefresh } from '@/utils/pearl-balance-events';
import { useToast } from '@/contexts/ToastContext';
import { MINI_GAMES, TAP_CHALLENGE_MAX_ATTEMPTS } from '@/utils/consts';

interface TapChallengePopupProps {
  onClose: () => void;
  onSuccess?: () => void;
}

const config = MINI_GAMES.tap_challenge;
const TARGET = config.targetTaps ?? 18;
const DURATION_MS = (config.timeSeconds ?? 3) * 1000;

export default function TapChallengePopup({ onClose, onSuccess }: TapChallengePopupProps) {
  const { userTelegramInitData, incrementPoints, setPoints, setPointsBalance } = useGameStore();
  const [phase, setPhase] = useState<'idle' | 'countdown' | 'playing' | 'done'>('idle');
  const [countdown, setCountdown] = useState(3);
  const [taps, setTaps] = useState(0);
  const [timeLeft, setTimeLeft] = useState(DURATION_MS / 1000);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [attemptsLeft, setAttemptsLeft] = useState<number | null>(null);
  const [claimedToday, setClaimedToday] = useState(false);
  const startTimeRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const failedAttemptRecordedRef = useRef(false);
  const showToast = useToast();

  // Fetch attempts left on mount and when returning to idle
  const fetchStatus = useCallback(async () => {
    if (!userTelegramInitData) return;
    try {
      const res = await fetch(`/api/mini-games?initData=${encodeURIComponent(userTelegramInitData)}`);
      const data = await res.json();
      const tapGame = data.games?.find((g: { id: string }) => g.id === 'tap_challenge');
      if (tapGame) {
        setAttemptsLeft(tapGame.attemptsLeft ?? TAP_CHALLENGE_MAX_ATTEMPTS);
        setClaimedToday(!!tapGame.claimedToday);
      }
    } catch {
      setAttemptsLeft(TAP_CHALLENGE_MAX_ATTEMPTS);
    }
  }, [userTelegramInitData]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleTap = useCallback(() => {
    triggerHapticFeedback(window);
    if (phase === 'playing') {
      setTaps((t) => t + 1);
    }
  }, [phase]);

  const startGame = useCallback(() => {
    triggerHapticFeedback(window);
    if (claimedToday || (attemptsLeft != null && attemptsLeft <= 0)) return;
    failedAttemptRecordedRef.current = false;
    setPhase('countdown');
    setCountdown(3);
    setTaps(0);
  }, [claimedToday, attemptsLeft]);

  useEffect(() => {
    if (phase === 'countdown') {
      if (countdown <= 0) {
        setPhase('playing');
        startTimeRef.current = Date.now();
        timerRef.current = setInterval(() => {
          const elapsed = Date.now() - startTimeRef.current;
          const left = Math.max(0, (DURATION_MS - elapsed) / 1000);
          setTimeLeft(left);
          if (left <= 0) {
            if (timerRef.current) clearInterval(timerRef.current);
            timerRef.current = null;
            setPhase('done');
          }
        }, 50);
      } else {
        const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
        return () => clearTimeout(t);
      }
    }
  }, [phase, countdown]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const submitResult = async () => {
    if (!userTelegramInitData || isSubmitting) return;
    // Claim is only for success (taps >= TARGET)
    if (taps < TARGET) return;
    setIsSubmitting(true);
    triggerHapticFeedback(window);
    try {
      const res = await fetch('/api/mini-games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData: userTelegramInitData, miniGameId: 'tap_challenge', tapCount: taps }),
      });
      const data = await res.json();
      if (data.success && data.claimed) {
        incrementPoints(data.reward);
        if (data.points != null) setPoints(data.points);
        if (data.pointsBalance != null) setPointsBalance(data.pointsBalance);
        showToast(data.message || `+${formatNumber(data.reward)} PEARLS!`, 'success');
        notifyPearlBalancesRefresh();
        onSuccess?.();
        onClose();
      } else {
        showToast(data.message || data.error || 'Claim failed', 'error');
      }
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // When user fails (done + taps < TARGET), record the attempt once so closing doesn't restore trials
  useEffect(() => {
    if (phase !== 'done' || taps >= TARGET || !userTelegramInitData || failedAttemptRecordedRef.current) return;
    failedAttemptRecordedRef.current = true;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/mini-games', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ initData: userTelegramInitData, miniGameId: 'tap_challenge', tapCount: taps }),
        });
        const data = await res.json();
        if (!cancelled && data.attemptsLeft != null) setAttemptsLeft(data.attemptsLeft);
      } catch {
        if (!cancelled) failedAttemptRecordedRef.current = false;
      }
    })();
    return () => { cancelled = true; };
  }, [phase, taps, userTelegramInitData]);

  const goBackToIdle = () => {
    triggerHapticFeedback(window);
    setPhase('idle');
  };

  const handleClose = () => {
    triggerHapticFeedback(window);
    if (timerRef.current) clearInterval(timerRef.current);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ura-navy/60 p-0 sm:items-center sm:p-4">
      <div className="max-h-[90dvh] w-full max-w-xl flex flex-col overflow-hidden animate-slide-up rounded-t-3xl bg-ura-panel sm:max-h-[85vh] sm:rounded-2xl">
        <div className="px-5 pt-6 pb-4 flex justify-between items-start">
          <div>
            <h2 className="text-xl font-bold text-white">Umeme Run</h2>
            <p className="text-sm text-gray-400">{config.description}</p>
          </div>
          <button onClick={handleClose} className="text-gray-400 hover:text-white text-2xl w-8 h-8">&times;</button>
        </div>
        <div className="px-4 pb-8">
          {phase === 'idle' && (
            <>
              <div className="text-center py-6">
                <p className="text-gray-300 mb-2">Tap {TARGET} times in {config.timeSeconds} seconds</p>
                <p className="text-[#f3ba2f] flex items-center justify-center gap-1">
                  <IceCube className="w-6 h-6" />
                  +{formatNumber(config.reward)} PEARLS
                </p>
                {attemptsLeft != null && (
                  <p className="text-amber-400 text-sm mt-2">Attempts left: {attemptsLeft}/{TAP_CHALLENGE_MAX_ATTEMPTS}</p>
                )}
              </div>
              {claimedToday ? (
                <p className="text-center text-emerald-400 py-4">You already claimed today. Come back tomorrow!</p>
              ) : attemptsLeft != null && attemptsLeft <= 0 ? (
                <p className="text-center text-amber-400 py-4">No attempts left. Come back tomorrow!</p>
              ) : (
                <button
                  onClick={startGame}
                  className="w-full py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-bold"
                >
                  Start
                </button>
              )}
            </>
          )}
          {phase === 'countdown' && (
            <div className="text-center py-12">
              <p className="text-6xl font-bold text-[#f3ba2f]">{countdown}</p>
              <p className="text-gray-400 mt-2">Get ready!</p>
            </div>
          )}
          {phase === 'playing' && (
            <>
              <div
                onClick={handleTap}
                className="w-full py-16 rounded-xl bg-gradient-to-r from-amber-500/30 to-amber-600/20 border-2 border-amber-500/50 text-center cursor-pointer active:scale-[0.98] select-none"
              >
                <p className="text-4xl font-bold text-white">{taps}</p>
                <p className="text-gray-400 mt-1">TAP!</p>
              </div>
              <p className="text-center text-amber-400 mt-2">{timeLeft.toFixed(1)}s left</p>
            </>
          )}
          {phase === 'done' && (
            <>
              <div className="text-center py-6">
                <p className="text-2xl font-bold text-white">{taps} taps</p>
                <p className={taps >= TARGET ? 'text-emerald-400' : 'text-amber-400'}>
                  {taps >= TARGET ? 'You did it!' : `Need ${TARGET} taps`}
                </p>
              </div>
              {taps >= TARGET ? (
                <button
                  onClick={submitResult}
                  disabled={isSubmitting}
                  className="w-full py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-bold disabled:opacity-50"
                >
                  {isSubmitting ? 'Claiming...' : 'Claim'}
                </button>
              ) : (
                <button
                  onClick={goBackToIdle}
                  className="w-full py-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold"
                >
                  Retry
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
