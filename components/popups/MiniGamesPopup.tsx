// components/popups/MiniGamesPopup.tsx

/**
 * When onlyGameId is set (e.g. "pattern_dots"): shows only that game (Daily Pattern).
 * When not set: shows list of games (used from hub). Currently only Daily Pattern entry uses this popup.
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import IceCube from '@/icons/IceCube';
import { useGameStore } from '@/utils/game-mechanics';
import { formatNumber, triggerHapticFeedback } from '@/utils/ui';
import { lightning, baseGift } from '@/images';
import TapChallengePopup from './TapChallengePopup';
import LuckySpinPopup from './LuckySpinPopup';
import PatternDotsPopup from './PatternDotsPopup';

interface GameItem {
  id: string;
  name: string;
  description: string;
  reward: number;
  claimedToday: boolean;
}

interface MiniGamesPopupProps {
  onClose: () => void;
  /** When set, show only this game (e.g. "pattern_dots" for Daily Pattern tab). */
  onlyGameId?: 'pattern_dots';
}

export default function MiniGamesPopup({ onClose, onlyGameId }: MiniGamesPopupProps) {
  const { userTelegramInitData } = useGameStore();
  const [games, setGames] = useState<GameItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeGame, setActiveGame] = useState<'tap_challenge' | 'lucky_spin' | 'pattern_dots' | null>(null);

  const fetchGames = useCallback(async () => {
    if (!userTelegramInitData) return;
    try {
      const res = await fetch(`/api/mini-games?initData=${encodeURIComponent(userTelegramInitData)}`);
      if (res.ok) {
        const data = await res.json();
        setGames(data.games ?? []);
      }
    } catch {
      setGames([]);
    } finally {
      setIsLoading(false);
    }
  }, [userTelegramInitData]);

  useEffect(() => {
    fetchGames();
  }, [fetchGames]);

  // When only Daily Pattern is shown, auto-open the game so user goes straight to the grid
  useEffect(() => {
    if (!onlyGameId || onlyGameId !== 'pattern_dots' || isLoading || games.length === 0) return;
    const patternGame = games.find((g) => g.id === 'pattern_dots');
    if (patternGame) setActiveGame('pattern_dots');
  }, [onlyGameId, isLoading, games]);

  const handleClose = () => {
    triggerHapticFeedback(window);
    onClose();
  };

  const handleGameSuccess = () => {
    fetchGames();
  };

  // When a game (Lucky Spin / Tap Challenge) is open, show only that popup to avoid double overlay (black screen)
  if (activeGame === 'tap_challenge') {
    return (
      <TapChallengePopup onClose={() => setActiveGame(null)} onSuccess={handleGameSuccess} />
    );
  }
  if (activeGame === 'lucky_spin') {
    const luckySpinGame = games.find((g) => g.id === 'lucky_spin');
    return (
      <LuckySpinPopup
        onClose={() => setActiveGame(null)}
        onSuccess={handleGameSuccess}
        claimedToday={luckySpinGame?.claimedToday ?? false}
      />
    );
  }
  if (activeGame === 'pattern_dots') {
    const patternGame = games.find((g) => g.id === 'pattern_dots');
    return (
      <PatternDotsPopup
        onClose={() => setActiveGame(null)}
        onSuccess={handleGameSuccess}
        claimedToday={patternGame?.claimedToday ?? false}
        reward={typeof patternGame?.reward === 'number' ? patternGame.reward : undefined}
      />
    );
  }

  // When onlyGameId is set, show just that game; otherwise show all (for hub use)
  const GAME_ORDER = ['tap_challenge', 'lucky_spin', 'drums_baobab', 'pattern_dots', 'savanna_hunt'];
  const allOrdered = [...(games ?? [])].sort((a, b) => GAME_ORDER.indexOf(a.id) - GAME_ORDER.indexOf(b.id));
  const orderedGames = onlyGameId ? allOrdered.filter((g) => g.id === onlyGameId) : allOrdered;
  const isDailyPatternOnly = onlyGameId === 'pattern_dots';
  const title = isDailyPatternOnly ? 'Daily Pattern' : 'Mini games';
  const subtitle = isDailyPatternOnly ? 'Draw the correct pattern once per day' : 'Play once per day each';

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ura-navy/60 p-0 sm:items-center sm:p-4">
      <div className="max-h-[90dvh] w-full max-w-xl flex flex-col overflow-hidden animate-slide-up rounded-t-3xl bg-ura-panel sm:max-h-[85vh] sm:rounded-2xl">
        <div className="px-5 pt-6 pb-4 flex justify-between items-start">
          <div>
            <h2 className="text-xl font-bold text-white">{title}</h2>
            <p className="text-sm text-gray-400">{subtitle}</p>
          </div>
          <button onClick={handleClose} className="text-gray-400 hover:text-white text-2xl w-8 h-8">&times;</button>
        </div>
        <div className="px-4 pb-8">
          {isLoading ? (
            <p className="text-center text-gray-400 py-8">Loading...</p>
          ) : orderedGames.length === 0 ? (
            <p className="text-center text-gray-400 py-8">{isDailyPatternOnly ? 'Daily Pattern is not available right now.' : 'No games available.'}</p>
          ) : (
            <div className="space-y-3">
              {orderedGames.map((game) => {
                const reward = game.reward ?? (game as { segmentRewards?: number[] }).segmentRewards?.[0] ?? 0;
                return (
                  <button
                    key={game.id}
                    onClick={() => {
                      triggerHapticFeedback(window);
                      setActiveGame(game.id as 'tap_challenge' | 'lucky_spin' | 'pattern_dots');
                    }}
                    className={`w-full flex items-center gap-4 p-4 rounded-xl text-left transition-all ${
                      game.claimedToday
                        ? 'bg-ura-panel-2/80 hover:bg-ura-panel-2 border border-ura-border/75'
                        : 'bg-ura-panel-2 hover:bg-[#3a3d42] border border-ura-border/75'
                    }`}
                  >
                    <div className="w-12 h-12 rounded-xl bg-ura-panel flex items-center justify-center flex-shrink-0">
                      {game.id === 'tap_challenge' ? (
                        <Image src={lightning} alt="" width={28} height={28} />
                      ) : game.id === 'pattern_dots' ? (
                        <svg width={28} height={28} viewBox="0 0 28 28" fill="none" className="text-[#f3ba2f]">
                          <circle cx="6" cy="6" r="3" fill="currentColor" />
                          <circle cx="14" cy="6" r="3" fill="currentColor" />
                          <circle cx="22" cy="6" r="3" fill="currentColor" />
                          <circle cx="6" cy="14" r="3" fill="currentColor" />
                          <circle cx="14" cy="14" r="3" fill="currentColor" />
                          <circle cx="22" cy="14" r="3" fill="currentColor" />
                          <circle cx="6" cy="22" r="3" fill="currentColor" />
                          <circle cx="14" cy="22" r="3" fill="currentColor" />
                          <circle cx="22" cy="22" r="3" fill="currentColor" />
                        </svg>
                      ) : (
                        <Image src={baseGift} alt="" width={28} height={28} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-white">{game.name}</p>
                      <p className="text-sm text-gray-400 truncate">{game.description}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <IceCube className="w-5 h-5 text-[#f3ba2f]" />
                      <span className="font-bold text-[#f3ba2f]">+{formatNumber(reward)}</span>
                      {game.claimedToday && (
                        <span className="text-emerald-400 text-sm">Done</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
