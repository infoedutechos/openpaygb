'use client';

/**
 * Savanna Hunt – 3D-style tap game: antelope (and rare golden) for points, avoid sacred animals.
 * Combo: consecutive correct taps build multiplier and currentComboPoints; sacred tap loses combo points and resets multiplier.
 * Tuning: spawn 1.1s ±0.2, max 12 animals, weights 0.76 / 0.12 / 0.12, animal lifetime 2–6s.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useGameStore } from '@/utils/game-mechanics';
import { formatNumber, triggerHapticFeedback } from '@/utils/ui';
import { notifyPearlBalancesRefresh } from '@/utils/pearl-balance-events';
import { useToast } from '@/contexts/ToastContext';
import { MINI_GAMES } from '@/utils/consts';
import IceCube from '@/icons/IceCube';

const config = MINI_GAMES.savanna_hunt as { sessionDurationSeconds?: number; maxReward?: number; minScoreToClaim?: number };
const DURATION_SEC = config.sessionDurationSeconds ?? 30;
const MIN_SCORE = config.minScoreToClaim ?? 5;
const POINTS_ANTELOPE = 10;
const POINTS_GOLDEN = 25;
const MULTIPLIER_STEP = 0.5;
const MAX_MULTIPLIER = 5;
// Spawn weights: antelope 0.76, golden 0.12, sacred 0.12
const SPAWN_WEIGHT_GOLDEN = 0.12;
const SPAWN_WEIGHT_SACRED = 0.12;
const SPAWN_INTERVAL_MEAN_MS = 1100;
const SPAWN_INTERVAL_VARIANCE_MS = 200;
const MAX_CONCURRENT_ANIMALS = 12;
const ANIMAL_LIFETIME_MIN_SEC = 2;
const ANIMAL_LIFETIME_MAX_SEC = 6;

type AnimalType = 'antelope' | 'golden' | 'sacred';
interface Animal {
  id: number;
  type: AnimalType;
  x: number;
  y: number;
  rotX: number;
  rotY: number;
  depth: number;
  spawnTime: number;
  /** Lifetime in ms; animal is removed when age exceeds this */
  lifetimeMs: number;
}

interface FloatingScore {
  id: number;
  value: number;
  x: number;
  y: number;
  positive: boolean;
  /** If true, animate as "fly away" (combo lost) */
  flyAway?: boolean;
}

interface TapBurst {
  id: number;
  x: number;
  y: number;
  positive: boolean;
}

const GRID_COLS = 4;
const GRID_ROWS = 3;
const CELL_W = 100 / GRID_COLS;
const CELL_H = 100 / GRID_ROWS;

function getRandomPosition(): { x: number; y: number } {
  const col = Math.floor(Math.random() * GRID_COLS);
  const row = Math.floor(Math.random() * GRID_ROWS);
  const x = col * CELL_W + CELL_W / 2 + (Math.random() - 0.5) * (CELL_W * 0.6);
  const y = row * CELL_H + CELL_H / 2 + (Math.random() - 0.5) * (CELL_H * 0.6);
  return { x, y };
}

interface SavannaHuntPopupProps {
  onClose: () => void;
  onSuccess?: () => void;
}

export default function SavannaHuntPopup({ onClose, onSuccess }: SavannaHuntPopupProps) {
  const { userTelegramInitData, setPointsBalance, setPoints, incrementPoints } = useGameStore();
  const [phase, setPhase] = useState<'intro' | 'countdown' | 'playing' | 'result'>('intro');
  const [countdown, setCountdown] = useState(3);
  const [score, setScore] = useState(0);
  const [multiplier, setMultiplier] = useState(1);
  const [comboCount, setComboCount] = useState(0);
  const [currentComboPoints, setCurrentComboPoints] = useState(0);
  const [timeLeft, setTimeLeft] = useState(DURATION_SEC);
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [floatingScores, setFloatingScores] = useState<FloatingScore[]>([]);
  const [tapBursts, setTapBursts] = useState<TapBurst[]>([]);
  const [comboPop, setComboPop] = useState<number | null>(null);
  const [comboLostMessage, setComboLostMessage] = useState(false);
  const [showGo, setShowGo] = useState(false);
  const [sessionsLeft, setSessionsLeft] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [claimedReward, setClaimedReward] = useState<number | null>(null);
  const animalIdRef = useRef(0);
  const floatIdRef = useRef(0);
  const burstIdRef = useRef(0);
  const currentComboPointsRef = useRef(0);
  const playingRef = useRef(false);
  const spawnTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lifetimeRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const goTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showToast = useToast();

  currentComboPointsRef.current = currentComboPoints;

  const fetchStatus = useCallback(async () => {
    if (!userTelegramInitData) return;
    try {
      const res = await fetch(`/api/mini-games?initData=${encodeURIComponent(userTelegramInitData)}`);
      const data = await res.json();
      const g = data.games?.find((x: { id: string }) => x.id === 'savanna_hunt');
      if (g != null) setSessionsLeft(g.sessionsLeft ?? 0);
    } catch {
      setSessionsLeft(5);
    }
  }, [userTelegramInitData]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const startGame = useCallback(() => {
    triggerHapticFeedback(window);
    if (sessionsLeft != null && sessionsLeft <= 0) {
      showToast('No sessions left today', 'error');
      return;
    }
    resultSubmittedRef.current = false;
    setPhase('countdown');
    setCountdown(3);
    setScore(0);
    setMultiplier(1);
    setComboCount(0);
    setCurrentComboPoints(0);
    setTimeLeft(DURATION_SEC);
    setAnimals([]);
    setFloatingScores([]);
    setTapBursts([]);
    setComboPop(null);
    setComboLostMessage(false);
    setClaimedReward(null);
    setShowGo(false);
  }, [sessionsLeft, showToast]);

  // Clear GO timeout when leaving countdown (e.g. popup closed)
  useEffect(() => {
    return () => {
      if (goTimeoutRef.current) {
        clearTimeout(goTimeoutRef.current);
        goTimeoutRef.current = null;
      }
    };
  }, [phase]);

  useEffect(() => {
    if (phase !== 'countdown') return;
    if (countdown <= 0 && !showGo) {
      setShowGo(true);
      goTimeoutRef.current = setTimeout(() => {
        goTimeoutRef.current = null;
        setShowGo(false);
        setPhase('playing');
      }, 500);
      return; // do not return a cleanup — next effect run (showGo=true) would clear the timeout and prevent transition to playing
    }
    if (countdown > 0) {
      const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [phase, countdown, showGo]);

  const submitResult = useCallback(async (finalScore: number) => {
    if (!userTelegramInitData) return;
    try {
      const res = await fetch('/api/mini-games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData: userTelegramInitData, miniGameId: 'savanna_hunt', finalScore }),
      });
      const data = await res.json();
      if (data.success && data.claimed) {
        incrementPoints(data.reward);
        if (data.points != null) setPoints(data.points);
        if (data.pointsBalance != null) setPointsBalance(data.pointsBalance);
        setClaimedReward(data.reward);
        showToast(`+${formatNumber(data.reward)} PEARLS!`, 'success');
        notifyPearlBalancesRefresh();
      } else if (data.sessionsLeft != null) {
        setSessionsLeft(data.sessionsLeft);
        if (data.message) showToast(data.message, 'error');
      }
      onSuccess?.();
      fetchStatus();
    } catch {
      showToast('Claim failed', 'error');
    } finally {
      setIsSubmitting(false);
    }
  }, [userTelegramInitData, incrementPoints, setPoints, setPointsBalance, showToast, onSuccess, fetchStatus]);

  // Variable spawn interval: 1.1s ± 0.2s; max 12 animals; animal lifetime 2–6s
  const scheduleSpawn = useCallback(() => {
    if (spawnTimeoutRef.current || !playingRef.current) return;
    const variance = SPAWN_INTERVAL_VARIANCE_MS * (2 * Math.random() - 1);
    const delay = Math.max(200, SPAWN_INTERVAL_MEAN_MS + variance);
    spawnTimeoutRef.current = setTimeout(() => {
      spawnTimeoutRef.current = null;
      if (!playingRef.current) return;
      setAnimals((prev) => {
        if (prev.length >= MAX_CONCURRENT_ANIMALS) return prev;
        animalIdRef.current += 1;
        const r = Math.random();
        const type: AnimalType =
          r < SPAWN_WEIGHT_GOLDEN ? 'golden' : r < SPAWN_WEIGHT_GOLDEN + SPAWN_WEIGHT_SACRED ? 'sacred' : 'antelope';
        const { x, y } = getRandomPosition();
        const spawnTime = Date.now();
        const lifetimeSec = ANIMAL_LIFETIME_MIN_SEC + Math.random() * (ANIMAL_LIFETIME_MAX_SEC - ANIMAL_LIFETIME_MIN_SEC);
        const lifetimeMs = Math.round(lifetimeSec * 1000);
        const next: Animal[] = [
          ...prev,
          {
            id: animalIdRef.current,
            type,
            x,
            y,
            rotX: (Math.random() - 0.5) * 24,
            rotY: (Math.random() - 0.5) * 24,
            depth: 10 + Math.random() * 40,
            spawnTime,
            lifetimeMs,
          },
        ].slice(-MAX_CONCURRENT_ANIMALS);
        return next;
      });
      scheduleSpawn();
    }, delay);
  }, []);

  useEffect(() => {
    if (phase !== 'playing') return;
    playingRef.current = true;
    const start = Date.now();
    timerRef.current = setInterval(() => {
      const elapsed = (Date.now() - start) / 1000;
      const left = Math.max(0, DURATION_SEC - elapsed);
      setTimeLeft(left);
      if (left <= 0 && timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
        setPhase('result');
      }
    }, 100);
    scheduleSpawn();
    lifetimeRef.current = setInterval(() => {
      const now = Date.now();
      setAnimals((prev) => prev.filter((a) => now - a.spawnTime < a.lifetimeMs));
    }, 400);
    return () => {
      playingRef.current = false;
      if (timerRef.current) clearInterval(timerRef.current);
      if (lifetimeRef.current) clearInterval(lifetimeRef.current);
      if (spawnTimeoutRef.current) {
        clearTimeout(spawnTimeoutRef.current);
        spawnTimeoutRef.current = null;
      }
    };
  }, [phase, scheduleSpawn]);

  const addFloatingScore = useCallback((value: number, x: number, y: number, positive: boolean, flyAway = false) => {
    floatIdRef.current += 1;
    const id = floatIdRef.current;
    setFloatingScores((prev) => [...prev, { id, value, x, y, positive, flyAway }]);
    setTimeout(() => setFloatingScores((p) => p.filter((f) => f.id !== id)), flyAway ? 1200 : 800);
  }, []);

  const addTapBurst = useCallback((x: number, y: number, positive: boolean) => {
    burstIdRef.current += 1;
    const id = burstIdRef.current;
    setTapBursts((prev) => [...prev, { id, x, y, positive }]);
    setTimeout(() => setTapBursts((p) => p.filter((b) => b.id !== id)), 450);
  }, []);

  const handleAnimalTap = useCallback((animal: Animal, clientX: number, clientY: number) => {
    triggerHapticFeedback(window);
    const rect = document.getElementById('savanna-stage')?.getBoundingClientRect();
    const x = rect ? ((clientX - rect.left) / rect.width) * 100 : animal.x;
    const y = rect ? ((clientY - rect.top) / rect.height) * 100 : animal.y;

    setAnimals((prev) => prev.filter((a) => a.id !== animal.id));

    if (animal.type === 'antelope') {
      const pts = Math.floor(POINTS_ANTELOPE * multiplier);
      setScore((s) => s + pts);
      setCurrentComboPoints((c) => {
        const next = c + pts;
        currentComboPointsRef.current = next;
        return next;
      });
      setComboCount((n) => n + 1);
      addFloatingScore(pts, x, y, true);
      addTapBurst(x, y, true);
      const newMult = Math.min(MAX_MULTIPLIER, multiplier + MULTIPLIER_STEP);
      if (newMult > multiplier) setComboPop(newMult);
      setTimeout(() => setComboPop(null), 400);
      setMultiplier(newMult);
    } else if (animal.type === 'golden') {
      const pts = Math.floor(POINTS_GOLDEN * multiplier);
      setScore((s) => s + pts);
      setCurrentComboPoints((c) => {
        const next = c + pts;
        currentComboPointsRef.current = next;
        return next;
      });
      setComboCount((n) => n + 1);
      addFloatingScore(pts, x, y, true);
      addTapBurst(x, y, true);
      const newMult = Math.min(MAX_MULTIPLIER, multiplier + MULTIPLIER_STEP);
      if (newMult > multiplier) setComboPop(newMult);
      setTimeout(() => setComboPop(null), 400);
      setMultiplier(newMult);
    } else {
      // Sacred: lose all points from current combo streak, reset multiplier
      const lost = currentComboPointsRef.current;
      currentComboPointsRef.current = 0;
      setScore((s) => Math.max(0, s - lost));
      if (lost > 0) {
        addFloatingScore(lost, x, y, false, true);
        setComboLostMessage(true);
        setTimeout(() => setComboLostMessage(false), 1800);
      }
      addTapBurst(x, y, false);
      setCurrentComboPoints(0);
      setComboCount(0);
      setMultiplier(1);
    }
  }, [multiplier, addFloatingScore, addTapBurst]);

  const resultSubmittedRef = useRef(false);
  useEffect(() => {
    if (phase === 'result' && !resultSubmittedRef.current) {
      resultSubmittedRef.current = true;
      setIsSubmitting(true);
      submitResult(score);
    }
  }, [phase, score, submitResult]);

  const handleClose = () => {
    triggerHapticFeedback(window);
    onClose();
  };

  const timePercent = (timeLeft / DURATION_SEC) * 100;

  // —— Intro ——
  if (phase === 'intro') {
    return (
      <div className="fixed inset-0 z-[60] flex flex-col bg-[#0a0c0e]">
        <style>{`
          @keyframes float-up { to { transform: translate(-50%, -120%) scale(1.2); opacity: 0; } }
          @keyframes float-away { 0% { transform: translate(-50%, -50%) scale(1); opacity: 1; } 70% { transform: translate(-50%, -80%) scale(1.1); opacity: 0.9; } 100% { transform: translate(-50%, -150%) scale(0.8); opacity: 0; } }
          @keyframes burst { to { transform: translate(-50%, -50%) scale(2.5); opacity: 0; } }
          @keyframes animal-in { from { transform: translate(-50%, -50%) scale(0) rotateX(-20deg); opacity: 0; } to { transform: translate(-50%, -50%) scale(1) rotateX(0deg); opacity: 1; } }
          @keyframes combo-pop { 0% { transform: scale(0.5); opacity: 0; } 50% { transform: scale(1.3); opacity: 1; } 100% { transform: scale(1); opacity: 1; } }
          @keyframes countdown-3d { from { transform: scale(0.3) rotateY(-90deg); opacity: 0; } to { transform: scale(1) rotateY(0deg); opacity: 1; } }
          @keyframes combo-lost-in { 0% { transform: scale(0.8); opacity: 0; } 20% { transform: scale(1.15); opacity: 1; } 100% { transform: scale(1); opacity: 1; } }
        `}</style>
        <div className="absolute inset-0 bg-gradient-to-b from-amber-950/30 via-[#0a0c0e] to-emerald-950/25 pointer-events-none" />
        <div className="shrink-0 flex items-center justify-between px-4 py-4 border-b border-amber-900/40 bg-ura-navy-deep/90/95 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <span className="text-3xl drop-shadow-lg" aria-hidden>🦒</span>
            <div>
              <h1 className="text-xl font-bold text-amber-50 tracking-tight">Savanna Hunt</h1>
              <p className="text-xs text-amber-200/70">3D-style · Tap targets · Earn PEARLS</p>
            </div>
          </div>
          <button type="button" onClick={handleClose} className="p-2.5 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 text-xl" aria-label="Close">&times;</button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          <section className="rounded-2xl bg-ura-panel/95 border border-amber-900/40 p-4 shadow-xl">
            <h2 className="text-sm font-semibold text-amber-200 uppercase tracking-wider mb-3">How to play</h2>
            <ul className="space-y-2.5 text-sm text-gray-300">
              <li className="flex items-start gap-2">
                <span className="text-xl shrink-0">🦌</span>
                <span><strong className="text-emerald-400">Antelope</strong> — tap for +{POINTS_ANTELOPE} pts. Chain correct taps for multiplier (up to ×{MAX_MULTIPLIER}).</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-xl shrink-0">✨🦌</span>
                <span><strong className="text-yellow-400">Golden antelope</strong> — rare! Tap for +{POINTS_GOLDEN} pts.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-xl shrink-0">🦁</span>
                <span><strong className="text-red-400">Sacred animal</strong> — avoid! Tap = you lose <em>all points from your current combo streak</em> and multiplier resets to ×1.</span>
              </li>
            </ul>
          </section>
          <section className="rounded-2xl bg-ura-panel/95 border border-amber-900/40 p-4 shadow-xl">
            <h2 className="text-sm font-semibold text-amber-200 uppercase tracking-wider mb-2">Rewards</h2>
            <p className="text-sm text-gray-400">One session = {DURATION_SEC}s. Score → PEARLS (max {formatNumber(config.maxReward ?? 40000)}/session). Min {MIN_SCORE} pts to claim. <strong className="text-amber-200">{sessionsLeft != null ? `${sessionsLeft} sessions` : '…'} left today</strong>.</p>
          </section>
        </div>
        <div className="flex gap-3 border-t border-amber-900/40 bg-ura-navy-deep/90/95 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <button type="button" onClick={handleClose} className="min-h-[48px] flex-1 rounded-xl bg-ura-panel-2 py-3.5 font-medium text-gray-300 hover:bg-[#2d3038]">Close</button>
          <button
            type="button"
            onClick={startGame}
            disabled={sessionsLeft != null && sessionsLeft <= 0}
            className="min-h-[48px] flex-1 rounded-xl bg-amber-500 py-3.5 font-bold text-black transition-all hover:bg-amber-400 active:scale-[0.98] disabled:opacity-50"
          >
            Start hunt
          </button>
        </div>
      </div>
    );
  }

  // —— Countdown (3D-style number) + GO! ——
  if (phase === 'countdown') {
    const display = showGo ? 'GO!' : countdown;
    return (
      <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-[#0a0c0e]">
        <div className="absolute inset-0 bg-gradient-to-b from-amber-950/40 via-transparent to-emerald-950/30 pointer-events-none" />
        <p
          className={`font-black tabular-nums ${showGo ? 'text-6xl text-emerald-400 sm:text-7xl' : 'text-7xl text-amber-400 sm:text-8xl'}`}
          style={{
            animation: 'countdown-3d 0.4s ease-out forwards',
            textShadow: showGo ? '0 0 50px rgba(52,211,153,0.6), 0 4px 20px rgba(0,0,0,0.5)' : '0 0 40px rgba(245,158,11,0.5), 0 4px 20px rgba(0,0,0,0.5)',
          }}
          aria-live="polite"
        >
          {display}
        </p>
        <p className="text-amber-200/90 mt-4 text-lg font-medium">{showGo ? 'Hunt!' : 'Get ready…'}</p>
      </div>
    );
  }

  // —— Playing (3D stage + parallax + floating scores + bursts) ——
  if (phase === 'playing') {
    return (
      <div className="fixed inset-0 z-[60] flex flex-col bg-[#0a0c0e]">
        <style>{`
          @keyframes float-up { to { transform: translate(-50%, -120%) scale(1.2); opacity: 0; } }
          @keyframes float-away { 0% { transform: translate(-50%, -50%) scale(1); opacity: 1; } 70% { transform: translate(-50%, -80%) scale(1.1); opacity: 0.9; } 100% { transform: translate(-50%, -150%) scale(0.8); opacity: 0; } }
          @keyframes burst { to { transform: translate(-50%, -50%) scale(2.5); opacity: 0; } }
          @keyframes animal-in { from { transform: translate(-50%, -50%) scale(0) rotateX(-20deg); opacity: 0; } to { transform: translate(-50%, -50%) scale(1) rotateX(0deg); opacity: 1; } }
          @keyframes combo-pop { 0% { transform: scale(0.5); opacity: 0; } 50% { transform: scale(1.3); opacity: 1; } 100% { transform: scale(1); opacity: 1; } }
          @keyframes combo-lost-in { 0% { transform: scale(0.8); opacity: 0; } 20% { transform: scale(1.15); opacity: 1; } 100% { transform: scale(1); opacity: 1; } }
        `}</style>
        <header className="shrink-0 flex flex-wrap items-center justify-between gap-2 px-4 py-3 bg-ura-navy-deep/90/95 border-b border-amber-900/30">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <span className="text-amber-400 font-bold tabular-nums text-lg">{Math.ceil(timeLeft)}s</span>
            <div className="h-2 w-20 rounded-full bg-ura-panel-2 overflow-hidden">
              <div className="h-full bg-amber-500 rounded-full transition-all duration-100" style={{ width: `${timePercent}%` }} />
            </div>
            <span className="text-white font-bold tabular-nums">Score: {score}</span>
            <div className="relative">
              <span className="px-2.5 py-1 rounded-lg bg-emerald-500/25 text-emerald-300 text-sm font-bold border border-emerald-500/40">×{multiplier.toFixed(1)}</span>
              {comboPop != null && (
                <span className="absolute -top-1 -right-1 text-xs font-black text-amber-300" style={{ animation: 'combo-pop 0.4s ease-out forwards' }}>×{comboPop}!</span>
              )}
            </div>
            {(comboCount > 0 || currentComboPoints > 0) && (
              <span className="px-2 py-1 rounded-lg bg-amber-500/20 text-amber-200 text-xs font-medium border border-amber-500/40">
                Combo: {comboCount} · +{currentComboPoints} pts
              </span>
            )}
          </div>
          <button type="button" onClick={handleClose} className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 text-xl" aria-label="Close">&times;</button>
        </header>

        <div
          id="savanna-stage"
          className="flex-1 relative overflow-hidden min-h-[300px]"
          style={{ perspective: '800px', transformStyle: 'preserve-3d' }}
        >
          {/* Parallax layers (2.5D depth) */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0 bg-gradient-to-b from-amber-900/20 via-transparent to-emerald-900/15" style={{ transform: 'translateZ(-100px) scale(1.4)' }} />
            <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-amber-950/60 to-transparent" style={{ transform: 'translateZ(-20px)' }} />
            <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-emerald-950/40 to-transparent rounded-t-[50%]" style={{ transform: 'translateZ(0px)' }} />
          </div>

          {/* 3D tilted floor (click-through for taps we handle on animals) */}
          <div
            className="absolute inset-0"
            style={{
              transform: 'perspective(800px) rotateX(12deg) scale(1.1)',
              transformStyle: 'preserve-3d',
              pointerEvents: 'none',
            }}
          />

          {/* Floating score popups (positive = float-up, negative/flyAway = fly away) */}
          {floatingScores.map((f) => (
            <div
              key={f.id}
              className="absolute pointer-events-none font-black tabular-nums z-20 text-xl"
              style={{
                left: `${f.x}%`,
                top: `${f.y}%`,
                transform: 'translate(-50%, -50%)',
                color: f.positive ? '#34d399' : '#f87171',
                textShadow: f.positive ? '0 0 12px rgba(52,211,153,0.8)' : '0 0 12px rgba(248,113,113,0.9)',
                animation: f.flyAway ? 'float-away 1.2s ease-out forwards' : 'float-up 0.8s ease-out forwards',
              }}
            >
              {f.positive ? '+' : '−'}{f.value}
            </div>
          ))}

          {/* Combo Lost message */}
          {comboLostMessage && (
            <div
              className="absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-30 px-4 py-2 rounded-xl bg-red-500/30 border-2 border-red-400/80 text-red-100 font-bold text-lg whitespace-nowrap"
              style={{ animation: 'combo-lost-in 0.35s ease-out forwards' }}
            >
              Combo lost!
            </div>
          )}

          {/* Tap burst rings */}
          {tapBursts.map((b) => (
            <div
              key={b.id}
              className="absolute rounded-full border-2 pointer-events-none z-10"
              style={{
                left: `${b.x}%`,
                top: `${b.y}%`,
                width: 24,
                height: 24,
                marginLeft: -12,
                marginTop: -12,
                borderColor: b.positive ? 'rgba(52,211,153,0.8)' : 'rgba(245,158,11,0.8)',
                animation: 'burst 0.45s ease-out forwards',
              }}
            />
          ))}

          {/* Animals with 3D transform + spawn animation */}
          {animals.map((a) => (
            <button
              key={a.id}
              type="button"
              className="absolute flex h-12 w-12 min-h-[44px] min-w-[44px] items-center justify-center rounded-2xl border-2 shadow-xl transition-transform duration-75 select-none cursor-pointer active:scale-90 sm:h-16 sm:w-16"
              style={{
                left: `${a.x}%`,
                top: `${a.y}%`,
                transform: `translate(-50%, -50%) rotateX(${a.rotX}deg) rotateY(${a.rotY}deg) translateZ(${a.depth}px)`,
                transformStyle: 'preserve-3d',
                backgroundColor: a.type === 'golden' ? 'rgba(250,204,21,0.35)' : a.type === 'antelope' ? 'rgba(52,211,153,0.25)' : 'rgba(245,158,11,0.25)',
                borderColor: a.type === 'golden' ? 'rgba(250,204,21,0.9)' : a.type === 'antelope' ? 'rgba(52,211,153,0.7)' : 'rgba(245,158,11,0.8)',
                boxShadow: a.type === 'golden' ? '0 0 20px rgba(250,204,21,0.4), 0 8px 24px rgba(0,0,0,0.3)' : '0 8px 24px rgba(0,0,0,0.25)',
                animation: 'animal-in 0.25s ease-out forwards',
              }}
              onClick={(e) => handleAnimalTap(a, e.clientX, e.clientY)}
              aria-label={a.type === 'golden' ? 'Golden antelope — bonus points' : a.type === 'antelope' ? 'Tap antelope' : 'Sacred — avoid'}
            >
              <span className="text-4xl drop-shadow-lg">
                {a.type === 'golden' ? '✨' : ''}{a.type === 'antelope' || a.type === 'golden' ? '🦌' : '🦁'}
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // —— Result ——
  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-[#0a0c0e]">
      <div className="absolute inset-0 bg-gradient-to-b from-amber-950/25 via-transparent to-emerald-950/20 pointer-events-none" />
      <div className="shrink-0 flex items-center justify-between px-4 py-4 border-b border-amber-900/40 bg-ura-navy-deep/90/95">
        <h1 className="text-lg font-bold text-amber-50">Session over</h1>
        <button type="button" onClick={handleClose} className="p-2.5 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 text-xl" aria-label="Close">&times;</button>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <p className="text-4xl font-black tabular-nums text-amber-400 drop-shadow-lg sm:text-5xl">{score}</p>
        <p className="text-gray-400 mt-1">points</p>
        {claimedReward != null ? (
          <div className="mt-8 flex items-center gap-3 px-5 py-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 shadow-lg">
            <IceCube className="w-8 h-8 text-emerald-400 shrink-0" />
            <span className="font-bold text-emerald-300 text-lg">+{formatNumber(claimedReward)} PEARLS claimed</span>
          </div>
        ) : isSubmitting ? (
          <p className="mt-8 text-amber-200/90">Claiming reward…</p>
        ) : score < MIN_SCORE ? (
          <p className="mt-8 text-center text-amber-200/90 text-sm max-w-xs">Need at least {MIN_SCORE} points to claim. This session still counts.</p>
        ) : (
          <p className="mt-8 text-gray-400 text-sm">Reward already claimed for this session.</p>
        )}
        {sessionsLeft != null && (
          <p className="mt-6 text-gray-500 text-sm">{sessionsLeft} session{sessionsLeft !== 1 ? 's' : ''} left today</p>
        )}
      </div>
      <div className="flex gap-3 border-t border-amber-900/40 bg-ura-navy-deep/90/95 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <button type="button" onClick={handleClose} className="min-h-[48px] flex-1 rounded-xl bg-ura-panel-2 py-3.5 font-medium text-gray-300 hover:bg-[#2d3038]">Close</button>
        <button
          type="button"
          onClick={startGame}
          disabled={sessionsLeft != null && sessionsLeft <= 0}
          className="min-h-[48px] flex-1 rounded-xl bg-amber-500 py-3.5 font-bold text-black transition-all hover:bg-amber-400 active:scale-[0.98] disabled:opacity-50"
        >
          Play again
        </button>
      </div>
    </div>
  );
}
