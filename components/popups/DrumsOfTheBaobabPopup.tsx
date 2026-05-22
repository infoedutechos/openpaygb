'use client';

/**
 * Drums of the Baobab – full-page rhythm tap game.
 * Spirit cards: wider hit window, combo forgiveness. Innovation cards: combo multiplier on reward.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useGameStore } from '@/utils/game-mechanics';
import { formatNumber, triggerHapticFeedback } from '@/utils/ui';
import { notifyPearlBalancesRefresh } from '@/utils/pearl-balance-events';
import { useToast } from '@/contexts/ToastContext';
import { MINI_GAMES } from '@/utils/consts';
import {
  SPIRIT_CARD,
  INNOVATION_CARD,
  getHitWindowMs,
  getComboMultiplier,
  getSpiritComboForgiveness,
  type SpiritRarity,
  type InnovationTier,
} from '@/utils/drums-baobab-cards';

const BEAT_INTERVAL_MS = 700;
const BASE_HIT_WINDOW_MS = 250;
const PERFECT_WINDOW_MS = 80;
const TOTAL_BEATS = 12;
const config = MINI_GAMES.drums_baobab;
const baseReward = (config as { reward?: number }).reward ?? 30000;

interface DrumsOfTheBaobabPopupProps {
  onClose: () => void;
  onSuccess?: () => void;
}

// Default equipped cards (demo: everyone has Common Spirit + Bronze Innovation)
const DEFAULT_SPIRIT: SpiritRarity = 'common';
const DEFAULT_INNOVATION: InnovationTier = 'bronze';

export default function DrumsOfTheBaobabPopup({ onClose, onSuccess }: DrumsOfTheBaobabPopupProps) {
  const { userTelegramInitData, setPointsBalance, setPoints } = useGameStore();
  const [phase, setPhase] = useState<'idle' | 'countdown' | 'playing' | 'result'>('idle');
  const [countdown, setCountdown] = useState(3);
  const [currentBeat, setCurrentBeat] = useState(0);
  const [hits, setHits] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [forgivenessLeft, setForgivenessLeft] = useState(0);
  const [lastHitQuality, setLastHitQuality] = useState<'perfect' | 'good' | null>(null);
  const [claimedToday, setClaimedToday] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [accuracy, setAccuracy] = useState(0);
  const [beatFlash, setBeatFlash] = useState(false);
  const [tapAnim, setTapAnim] = useState(false);
  const [ripples, setRipples] = useState<{ id: number }[]>([]);
  const spiritRarity = DEFAULT_SPIRIT;
  const innovationTier = DEFAULT_INNOVATION;
  const hitWindowMs = getHitWindowMs(BASE_HIT_WINDOW_MS, spiritRarity);
  const beatStartRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hitsRef = useRef<number>(0);
  const maxComboRef = useRef<number>(0);
  const forgivenessRef = useRef<number>(0);
  const rippleIdRef = useRef(0);
  const showToast = useToast();
  hitsRef.current = hits;
  maxComboRef.current = Math.max(maxComboRef.current, combo);
  forgivenessRef.current = forgivenessLeft;

  const fetchStatus = useCallback(async () => {
    if (!userTelegramInitData) return;
    try {
      const res = await fetch(`/api/mini-games?initData=${encodeURIComponent(userTelegramInitData)}`);
      const data = await res.json();
      const g = data.games?.find((x: { id: string }) => x.id === 'drums_baobab');
      if (g) setClaimedToday(!!g.claimedToday);
    } catch {
      setClaimedToday(false);
    }
  }, [userTelegramInitData]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const startGame = useCallback(() => {
    triggerHapticFeedback(window);
    if (claimedToday) return;
    setPhase('countdown');
    setCountdown(3);
    setCurrentBeat(0);
    setHits(0);
    setCombo(0);
    setMaxCombo(0);
    maxComboRef.current = 0;
    const initForgiveness = getSpiritComboForgiveness(spiritRarity);
    setForgivenessLeft(initForgiveness);
    forgivenessRef.current = initForgiveness;
    setLastHitQuality(null);
  }, [claimedToday, spiritRarity]);

  useEffect(() => {
    if (phase !== 'countdown') return;
    if (countdown <= 0) {
      setPhase('playing');
      setCurrentBeat(0);
      beatStartRef.current = Date.now();
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, countdown]);

  useEffect(() => {
    if (phase === 'playing' && currentBeat === 0) {
      beatStartRef.current = Date.now();
      setBeatFlash(true);
    }
  }, [phase, currentBeat]);

  useEffect(() => {
    if (phase !== 'playing') return;
    const advance = () => {
      setCurrentBeat((b) => {
        if (b >= TOTAL_BEATS - 1) return b;
        beatStartRef.current = Date.now();
        setBeatFlash(true);
        return b + 1;
      });
    };
    timerRef.current = setTimeout(advance, BEAT_INTERVAL_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [phase, currentBeat]);

  // Reset beat flash after glow so it can replay on next beat
  useEffect(() => {
    if (phase !== 'playing' || !beatFlash) return;
    const t = setTimeout(() => setBeatFlash(false), 700);
    return () => clearTimeout(t);
  }, [phase, beatFlash, currentBeat]);

  useEffect(() => {
    if (phase !== 'playing') return;
    const endGame = setTimeout(() => {
      const acc = TOTAL_BEATS > 0 ? Math.round((hitsRef.current / TOTAL_BEATS) * 100) : 0;
      setAccuracy(acc);
      setMaxCombo(maxComboRef.current);
      setPhase('result');
    }, TOTAL_BEATS * BEAT_INTERVAL_MS + 500);
    return () => clearTimeout(endGame);
  }, [phase]);

  const handleTap = useCallback(() => {
    triggerHapticFeedback(window);
    if (phase !== 'playing') return;
    const elapsed = Date.now() - beatStartRef.current;
    const center = BEAT_INTERVAL_MS;
    const inWindow = elapsed >= center - hitWindowMs && elapsed <= center + hitWindowMs;
    if (inWindow) {
      const isPerfect = Math.abs(elapsed - center) <= PERFECT_WINDOW_MS;
      setHits((h) => h + 1);
      setCombo((c) => {
        const next = c + 1;
        if (next > maxComboRef.current) maxComboRef.current = next;
        return next;
      });
      const newForgiveness = getSpiritComboForgiveness(spiritRarity);
      setForgivenessLeft(newForgiveness);
      forgivenessRef.current = newForgiveness;
      setLastHitQuality(isPerfect ? 'perfect' : 'good');
      setTapAnim(true);
      setTimeout(() => setTapAnim(false), 280);
      setRipples((r) => [...r, { id: rippleIdRef.current++ }]);
      setTimeout(() => setRipples((r) => r.slice(1)), 520);
    } else {
      const f = forgivenessRef.current;
      if (f > 0) {
        setForgivenessLeft(f - 1);
        forgivenessRef.current = f - 1;
      } else {
        setCombo(0);
      }
      setLastHitQuality(null);
    }
  }, [phase, hitWindowMs, spiritRarity]);

  const handleClaim = useCallback(async () => {
    if (!userTelegramInitData || accuracy < 50) return;
    triggerHapticFeedback(window);
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/mini-games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          initData: userTelegramInitData,
          miniGameId: 'drums_baobab',
          accuracyPercent: accuracy,
          maxCombo,
          spiritRarity,
          innovationTier,
        }),
      });
      const data = await res.json();
      if (data.success && data.pointsBalance != null) {
        setPointsBalance(data.pointsBalance);
        if (data.points != null) setPoints(data.points);
        showToast(data.message ?? `+${formatNumber(data.reward)} PEARLS!`, 'success');
        notifyPearlBalancesRefresh();
        onSuccess?.();
        onClose();
      } else {
        showToast(data.message ?? 'Could not claim', 'error');
      }
    } catch {
      showToast('Request failed', 'error');
    } finally {
      setIsSubmitting(false);
    }
  }, [userTelegramInitData, accuracy, maxCombo, spiritRarity, innovationTier, setPointsBalance, setPoints, showToast, onSuccess, onClose]);

  const baseFromAccuracy = (baseReward * accuracy) / 100;
  const comboMult = getComboMultiplier(maxCombo, innovationTier);
  const reward = Math.round(baseFromAccuracy * comboMult);
  const comboBonus = reward - Math.round(baseFromAccuracy);

  // Full-page solid background so no other UI shows through
  const fullPageClass =
    'fixed inset-0 z-[9999] flex flex-col min-h-[100vh] min-h-[100dvh] w-full overflow-hidden ' +
    'bg-gradient-to-b from-[#0d0a06] via-[#1a1208] to-[#0f0c06]';

  if (phase === 'result') {
    const canClaim = accuracy >= 50;
    return (
      <div className={fullPageClass}>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_0%,rgba(243,186,47,0.12),transparent)] pointer-events-none" />
        <div className="flex flex-1 flex-col items-center justify-center p-6 relative z-10">
          <div className="bg-[#1a1510]/90 backdrop-blur-sm rounded-3xl border border-amber-500/30 shadow-2xl shadow-amber-900/20 max-w-sm w-full p-8 text-center">
            <p className="text-5xl mb-3">🥁</p>
            <h2 className="text-2xl font-bold text-amber-100 mb-1">Drums of the Baobab</h2>
            <p className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-amber-500 mb-1">
              {accuracy}%
            </p>
            <p className="text-amber-200/80 text-sm mb-2">accuracy · max combo {maxCombo}×</p>
            {canClaim && (
              <div className="rounded-xl bg-[#0d0a06]/60 border border-amber-500/20 p-3 mb-4 text-left">
                <p className="text-xs font-semibold text-amber-400/90 uppercase tracking-wider mb-2">Reward breakdown</p>
                <p className="text-amber-200/90 text-sm flex justify-between"><span>Base ({accuracy}%)</span><span>{formatNumber(Math.round(baseFromAccuracy))} PEARLS</span></p>
                {comboBonus > 0 && (
                  <p className="text-amber-300/90 text-sm flex justify-between mt-1">
                    <span>Innovation combo bonus</span><span>+{formatNumber(comboBonus)} PEARLS</span>
                  </p>
                )}
                <p className="text-amber-100 font-semibold text-base flex justify-between mt-2 pt-2 border-t border-amber-500/20">
                  <span>Total</span><span>+{formatNumber(reward)} PEARLS</span>
                </p>
                <p className="text-[10px] text-amber-400/60 mt-2">Spirit ({SPIRIT_CARD[spiritRarity].label}) · Innovation ({INNOVATION_CARD[innovationTier].label})</p>
              </div>
            )}
            {canClaim ? (
              <>
                <p className="text-amber-100 font-semibold text-lg mb-4">+{formatNumber(reward)} PEARLS</p>
                <button
                  type="button"
                  onClick={handleClaim}
                  disabled={isSubmitting}
                  className="min-h-[48px] w-full rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 py-4 text-lg font-bold text-black shadow-lg shadow-amber-900/30 transition active:scale-[0.98] disabled:opacity-50 sm:text-lg"
                >
                  {isSubmitting ? 'Claiming…' : 'Claim reward'}
                </button>
              </>
            ) : (
              <p className="text-amber-300/90 text-sm mb-6">Need 50%+ accuracy to claim. Try again!</p>
            )}
            <button
              type="button"
              onClick={onClose}
              className="w-full mt-4 py-3 rounded-2xl bg-[#2a2520] text-amber-200 border border-amber-500/20 font-medium"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={fullPageClass}>
      {/* Solid themed background – no transparency */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_120%_80%_at_50%_20%,rgba(180,120,40,0.15),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_90%,rgba(60,40,20,0.4),transparent)]" />
      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\' fill=\'%23d4af37\' fill-opacity=\'1\' fill-rule=\'nonzero\'/%3E%3C/g%3E%3C/svg%3E")' }} />

      <header className="relative z-10 flex items-center justify-between px-4 pb-2" style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}>
        <button
          type="button"
          onClick={onClose}
          className="p-2 -ml-2 rounded-xl text-amber-200/80 hover:text-amber-100 hover:bg-amber-500/10 transition"
          aria-label="Close"
        >
          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <h1 className="text-lg font-bold text-amber-100/90 tracking-wide">Drums of the Baobab</h1>
        <div className="w-10" />
      </header>

      {phase === 'idle' && (
        <div className="flex-1 flex flex-col items-center justify-center px-6 relative z-10">
          <div className="w-28 h-28 rounded-full bg-gradient-to-b from-amber-600 to-amber-800 border-4 border-amber-400/50 shadow-xl shadow-amber-900/30 flex items-center justify-center drum-idle mb-6">
            <span className="text-5xl">🥁</span>
          </div>
          <p className="text-amber-200/90 text-center text-sm max-w-xs mb-6">
            Tap when the drum glows. {TOTAL_BEATS} beats — accuracy and combo decide your reward.
          </p>
          {/* Rhythm items: Spirit & Innovation cards */}
          <div className="w-full max-w-sm mb-6 rounded-2xl bg-[#1a1510]/80 border border-amber-500/25 p-4">
            <p className="text-xs font-semibold text-amber-400/90 uppercase tracking-wider mb-3 text-center">Active rhythm items</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-gradient-to-b from-amber-900/40 to-amber-950/50 border border-amber-500/30 p-3 text-center">
                <span className="text-2xl block mb-1">✨</span>
                <p className="text-amber-200 font-medium text-sm">Spirit Card</p>
                <p className="text-amber-400/80 text-xs mt-0.5">{SPIRIT_CARD[spiritRarity].label}</p>
                <p className="text-[10px] text-amber-300/70 mt-1">
                  +{Math.round((SPIRIT_CARD[spiritRarity].hitWindowMultiplier - 1) * 100)}% hit window
                  {SPIRIT_CARD[spiritRarity].comboForgiveness > 0 && ` · ${SPIRIT_CARD[spiritRarity].comboForgiveness} miss forgiveness`}
                </p>
              </div>
              <div className="rounded-xl bg-gradient-to-b from-amber-900/40 to-amber-950/50 border border-amber-500/30 p-3 text-center">
                <span className="text-2xl block mb-1">💡</span>
                <p className="text-amber-200 font-medium text-sm">Innovation Card</p>
                <p className="text-amber-400/80 text-xs mt-0.5">{INNOVATION_CARD[innovationTier].label}</p>
                <p className="text-[10px] text-amber-300/70 mt-1">
                  Combo bonus up to +{INNOVATION_CARD[innovationTier].maxBonusPercent}% reward
                </p>
              </div>
            </div>
          </div>
          {claimedToday ? (
            <p className="text-amber-300/90 text-sm font-medium">Already claimed today. Come back tomorrow.</p>
          ) : (
            <button
              type="button"
              onClick={startGame}
              className="px-10 py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 text-black font-bold text-lg shadow-lg shadow-amber-900/30 active:scale-[0.98] transition"
            >
              Play
            </button>
          )}
        </div>
      )}

      {phase === 'countdown' && (
        <div className="flex-1 flex flex-col items-center justify-center relative z-10">
          <p className="text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-amber-500 tabular-nums">
            {countdown}
          </p>
          <p className="text-amber-200/80 text-sm mt-4">Get ready to tap…</p>
        </div>
      )}

      {phase === 'playing' && (
        <div className="flex-1 flex flex-col items-center justify-center px-4 relative z-10">
          {/* Active items strip */}
          <div className="flex gap-2 mb-2">
            <span className="rounded-lg bg-amber-900/40 border border-amber-500/30 px-2 py-1 text-[10px] text-amber-300/90" title="Spirit Card">✨ {SPIRIT_CARD[spiritRarity].label}</span>
            <span className="rounded-lg bg-amber-900/40 border border-amber-500/30 px-2 py-1 text-[10px] text-amber-300/90" title="Innovation Card">💡 {INNOVATION_CARD[innovationTier].label}</span>
          </div>
          {/* Beat progress */}
          <div className="flex gap-1.5 mb-6">
            {Array.from({ length: TOTAL_BEATS }).map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-all duration-200 ${
                  i < currentBeat ? 'bg-amber-400 scale-100' : i === currentBeat ? 'bg-amber-300 scale-125' : 'bg-amber-900/50'
                }`}
              />
            ))}
          </div>
          <p className="text-amber-200/80 text-sm mb-2">
            Beat {currentBeat + 1} / {TOTAL_BEATS}
          </p>
          {combo > 1 && (
            <p className="text-amber-300 font-semibold text-sm mb-1">{combo}× combo</p>
          )}
          {lastHitQuality === 'perfect' && (
            <p className="text-amber-300 font-bold text-sm animate-pulse">Perfect!</p>
          )}
          {lastHitQuality === 'good' && (
            <p className="text-amber-400/90 text-sm">Good</p>
          )}

          {/* Big moving drum + tap area */}
          <div className="relative mt-4 flex items-center justify-center">
            {ripples.map((r) => (
              <div
                key={r.id}
                className="absolute inset-0 rounded-full border-4 border-amber-400/60 drum-ripple pointer-events-none"
                style={{ width: 'min(72vw, 280px)', height: 'min(72vw, 280px)', margin: 'auto' }}
              />
            ))}
            <button
              type="button"
              onClick={handleTap}
              className={`relative flex items-center justify-center rounded-full border-4 shadow-2xl active:outline-none focus:outline-none select-none touch-manipulation
                min-w-[min(72vw,280px)] min-h-[min(72vw,280px)] w-[min(72vw,280px)] h-[min(72vw,280px)]
                bg-gradient-to-b from-amber-500 via-amber-600 to-amber-800
                border-amber-300/80
                shadow-amber-900/40
                ${beatFlash ? 'drum-beat-glow' : 'drum-idle'}
                ${tapAnim ? 'drum-tap-squash' : ''}`}
              style={{ willChange: tapAnim ? 'transform' : undefined }}
              aria-label="Tap drum"
            >
              <span className="text-7xl sm:text-8xl drop-shadow-lg">🥁</span>
            </button>
          </div>
          <p className="text-amber-200/70 text-sm mt-6">Hits: {hits}</p>
        </div>
      )}
    </div>
  );
}
