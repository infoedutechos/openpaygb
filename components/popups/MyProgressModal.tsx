'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Cross from '@/icons/Cross';
import { useGameStore } from '@/utils/game-mechanics';
import { LEVELS } from '@/utils/consts';
import { formatNumber, triggerHapticFeedback } from '@/utils/ui';
import NotificationCenter from '@/components/NotificationCenter';

interface MyProgressModalProps {
  onClose: () => void;
  onOpenGuide?: () => void;
}

interface ServerProgress {
  points: number;
  pointsBalance: number;
  gameLevelIndex: number;
  totalDonatedPoints: number;
}

export default function MyProgressModal({ onClose, onOpenGuide }: MyProgressModalProps) {
  const {
    userTelegramName,
    userTelegramInitData,
    points,
    pointsBalance,
    gameLevelIndex,
    setTotalDonatedPoints,
  } = useGameStore();

  const [serverProgress, setServerProgress] = useState<ServerProgress | null>(null);
  const [progressLoading, setProgressLoading] = useState(true);

  const fetchProgress = useCallback(async () => {
    if (!userTelegramInitData) {
      setProgressLoading(false);
      return;
    }
    try {
      const res = await fetch(`/api/rankings/me?initData=${encodeURIComponent(userTelegramInitData)}`);
      if (res.ok) {
        const data = await res.json();
        const progress: ServerProgress = {
          points: data.points ?? 0,
          pointsBalance: data.pointsBalance ?? 0,
          gameLevelIndex: typeof data.gameLevelIndex === 'number' ? data.gameLevelIndex : gameLevelIndex,
          totalDonatedPoints: typeof data.totalDonatedPoints === 'number' ? data.totalDonatedPoints : 0,
        };
        setServerProgress(progress);
        if (typeof data.totalDonatedPoints === 'number') setTotalDonatedPoints(data.totalDonatedPoints);
      }
    } catch {
      // keep serverProgress null, use store
    } finally {
      setProgressLoading(false);
    }
  }, [userTelegramInitData, gameLevelIndex, setTotalDonatedPoints]);

  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  const displayPoints = serverProgress?.points ?? points;
  const displayBalance = serverProgress?.pointsBalance ?? pointsBalance;
  const rawLevelIndex = serverProgress?.gameLevelIndex ?? gameLevelIndex;
  const displayLevelIndex = Math.min(Math.max(rawLevelIndex, 0), LEVELS.length - 1);
  const displayTotalDonated = serverProgress?.totalDonatedPoints ?? 0;

  const currentLevel = LEVELS[displayLevelIndex];
  const nextLevel = displayLevelIndex < LEVELS.length - 1 ? LEVELS[displayLevelIndex + 1] : null;
  const pointsLeft = nextLevel ? Math.max(0, nextLevel.minPoints - displayPoints) : 0;
  const primary = currentLevel?.primaryColor ?? '#5B6C8F';
  const accent = currentLevel?.accentColor ?? '#AAB2C0';

  const handleClose = () => {
    triggerHapticFeedback(window);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-ura-navy/80 p-0 sm:items-center sm:p-4">
      <div className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-ura-panel-2 sm:max-h-[85vh] sm:rounded-2xl">
        <div className="p-4 border-b border-gray-700 flex items-center justify-between gap-2 sticky top-0 bg-ura-panel-2 z-10">
          <h2 className="text-lg font-bold text-white shrink-0">My Progress</h2>
          <div className="flex items-center gap-1">
            <NotificationCenter />
            {onOpenGuide && (
              <button
                type="button"
                onClick={() => { triggerHapticFeedback(window); onOpenGuide(); }}
                className="w-9 h-9 bg-ura-panel rounded-full flex items-center justify-center text-white"
                title="How to play"
                aria-label="How to play"
              >
                <span className="text-lg">📖</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleClose}
              className="w-8 h-8 bg-ura-panel rounded-full flex items-center justify-center shrink-0"
            >
              <Cross className="text-gray-400 w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {/* Current level & name */}
          <div className="flex items-center gap-3">
            <div className="p-1 rounded-lg bg-ura-panel">
              <Image
                src={currentLevel.smallImage}
                width={40}
                height={40}
                alt={currentLevel.name}
              />
            </div>
            <div>
              <p className="text-white font-semibold flex items-center gap-1.5">
                {userTelegramName}
                {displayTotalDonated > 0 && (
                  <span className="text-amber-400" title="Donor">⭐</span>
                )}
              </p>
              <p className="text-sm" style={{ color: accent }}>
                {currentLevel.name} · Rank {displayLevelIndex + 1} / {LEVELS.length}
              </p>
            </div>
          </div>

          {/* Points & Balance - from server when available */}
          {progressLoading ? (
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-ura-panel p-3 rounded-lg text-center animate-pulse">
                <div className="text-xs text-gray-400">Total PEARLS</div>
                <div className="text-sm font-bold text-gray-500">…</div>
              </div>
              <div className="bg-ura-panel p-3 rounded-lg text-center animate-pulse">
                <div className="text-xs text-gray-400">Balance</div>
                <div className="text-sm font-bold text-gray-500">…</div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-ura-panel p-3 rounded-lg text-center">
                <div className="text-xs text-gray-400">Total PEARLS</div>
                <div className="text-sm font-bold text-[#f3ba2f]">{formatNumber(Math.floor(displayPoints))}</div>
              </div>
              <div className="bg-ura-panel p-3 rounded-lg text-center">
                <div className="text-xs text-gray-400">Balance</div>
                <div className="text-sm font-bold text-white">{formatNumber(Math.floor(displayBalance))}</div>
              </div>
            </div>
          )}

          {/* Progress to next level (PEARLS only; taps no longer required) */}
          {nextLevel && (
            <div className="bg-ura-panel p-4 rounded-lg space-y-2">
              <p className="text-sm font-medium text-white">To reach {nextLevel.name}</p>
              <p className="text-xs text-gray-400">{formatNumber(pointsLeft)} PEARLS left</p>
              <div className="h-2 bg-[#43433b] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-[width]"
                  style={{
                    width: `${(() => {
                      const need = nextLevel.minPoints - (currentLevel?.minPoints ?? 0);
                      const have = displayPoints - (currentLevel?.minPoints ?? 0);
                      if (need <= 0) return 100;
                      return Math.min(100, Math.max(0, (have / need) * 100));
                    })()}%`,
                    background: `linear-gradient(to right, ${primary}, ${accent})`,
                  }}
                />
              </div>
            </div>
          )}

          {/* Levels table (PEARLS only for progression) */}
          <div className="bg-ura-panel rounded-lg overflow-hidden">
            <p className="text-sm font-medium text-white px-3 py-2 border-b border-gray-700">
              All levels (by PEARLS)
            </p>
            <ul className="max-h-64 divide-y divide-gray-700/50 overflow-y-auto md:hidden">
              {LEVELS.map((level, i) => (
                <li
                  key={level.name}
                  className={`flex items-center gap-2 px-3 py-2.5 ${i === displayLevelIndex ? "bg-ura-panel-2" : ""}`}
                >
                  <span className="w-6 text-xs text-gray-400">{i + 1}</span>
                  <div className="h-8 w-8 shrink-0 overflow-hidden rounded-lg bg-ura-panel-2">
                    <Image src={level.smallImage} width={24} height={24} alt={level.name} className="object-cover" />
                  </div>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-white">{level.name}</span>
                  <span className="shrink-0 text-xs text-gray-300">{formatNumber(level.minPoints)}</span>
                </li>
              ))}
            </ul>
            <div className="hidden max-h-64 overflow-x-auto overflow-y-auto md:block">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-gray-400 border-b border-gray-700">
                    <th className="px-2 py-2 w-8">#</th>
                    <th className="px-2 py-2">Level</th>
                    <th className="px-2 py-2 text-right">Min PEARLS</th>
                  </tr>
                </thead>
                <tbody>
                  {LEVELS.map((level, i) => (
                    <tr
                      key={level.name}
                      className={`border-b border-gray-700/50 ${
                        i === displayLevelIndex ? 'bg-ura-panel-2' : ''
                      }`}
                    >
                      <td className="px-2 py-2 text-gray-400">{i + 1}</td>
                      <td className="px-2 py-2">
                        <div className="flex items-center gap-2">
                          <div className="flex-shrink-0 w-8 h-8 rounded-lg overflow-hidden bg-ura-panel-2 flex items-center justify-center">
                            <Image
                              src={level.smallImage}
                              width={24}
                              height={24}
                              alt={level.name}
                              className="object-cover"
                            />
                          </div>
                          <span className="font-medium text-white">{level.name}</span>
                        </div>
                      </td>
                      <td className="px-2 py-2 text-right text-gray-300">
                        {formatNumber(level.minPoints)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
