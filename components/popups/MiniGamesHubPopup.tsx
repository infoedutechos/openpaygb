'use client';

/**
 * Mini Games Hub – production-ready Afrolumens mini-games only.
 * Roadmap game definitions remain in the catalog but are not advertised as playable.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useGameStore } from '@/utils/game-mechanics';
import { triggerHapticFeedback } from '@/utils/ui';
import { AFROLUMENS_MINI_GAMES, MINI_GAME_TIER_LABELS, getGameById, type MiniGameTier, type AfrolumensGameDef } from '@/utils/afrolumens-mini-games';
import TapChallengePopup from './TapChallengePopup';
import LuckySpinPopup from './LuckySpinPopup';
import DrumsOfTheBaobabPopup from './DrumsOfTheBaobabPopup';
import SavannaHuntPopup from './SavannaHuntPopup';

interface ApiGame {
  id: string;
  claimedToday?: boolean;
  attemptsLeft?: number;
}

interface MiniGamesHubPopupProps {
  onClose: () => void;
}

const TIER_COLORS: Record<MiniGameTier, string> = {
  casual: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  skill: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  competitive: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
};

function GameDetailModal({
  game,
  onClose,
  onPlay,
}: {
  game: AfrolumensGameDef;
  onClose: () => void;
  onPlay: () => void;
}) {
  const { intro } = game;
  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-ura-navy/60 p-0 sm:items-center sm:p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="bg-ura-panel rounded-2xl max-w-md w-full max-h-[85vh] overflow-hidden shadow-xl border border-ura-border/75"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 pb-4 border-b border-ura-border/75 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <span className="text-4xl block mb-1">{game.emoji}</span>
            <h2 className="text-xl font-bold text-white truncate">{game.name}</h2>
            <span className={`inline-block text-xs font-medium rounded px-2 py-0.5 border mt-1 ${TIER_COLORS[game.tier]}`}>
              {MINI_GAME_TIER_LABELS[game.tier]}
            </span>
          </div>
          <button
            type="button"
            onClick={() => { triggerHapticFeedback(window); onClose(); }}
            className="p-2 rounded-full text-gray-400 hover:text-white text-2xl shrink-0"
            aria-label="Close"
          >
            &times;
          </button>
        </div>
        <div className="p-5 overflow-y-auto max-h-[60vh] space-y-4 text-sm">
          <div>
            <h3 className="text-xs font-semibold text-[#f3ba2f] uppercase tracking-wide mb-1">Type</h3>
            <p className="text-gray-300">{intro.type}</p>
          </div>
          <div>
            <h3 className="text-xs font-semibold text-[#f3ba2f] uppercase tracking-wide mb-1">Concept</h3>
            <p className="text-gray-300">{intro.concept}</p>
          </div>
          <div>
            <h3 className="text-xs font-semibold text-[#f3ba2f] uppercase tracking-wide mb-1">Gameplay</h3>
            <p className="text-gray-300">{intro.gameplay}</p>
          </div>
          <div>
            <h3 className="text-xs font-semibold text-[#f3ba2f] uppercase tracking-wide mb-1">Reward logic</h3>
            <p className="text-gray-300">{intro.rewardLogic}</p>
          </div>
          {intro.nftUtility && (
            <div>
              <h3 className="text-xs font-semibold text-[#f3ba2f] uppercase tracking-wide mb-1">NFT utility</h3>
              <p className="text-gray-300">{intro.nftUtility}</p>
            </div>
          )}
        </div>
        <div className="p-5 pt-4 border-t border-ura-border/75 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 rounded-xl bg-[#3d4046] text-white font-medium"
          >
            Back
          </button>
          <button
            type="button"
            onClick={() => { triggerHapticFeedback(window); onPlay(); }}
            className="flex-1 py-3 rounded-xl bg-ura-gold text-black font-bold"
          >
            Play
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MiniGamesHubPopup({ onClose }: MiniGamesHubPopupProps) {
  const { userTelegramInitData } = useGameStore();
  const [apiGames, setApiGames] = useState<ApiGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const [activeGameId, setActiveGameId] = useState<string | null>(null);

  const fetchGames = useCallback(async () => {
    if (!userTelegramInitData) return;
    try {
      const res = await fetch(`/api/mini-games?initData=${encodeURIComponent(userTelegramInitData)}`);
      const data = await res.json();
      setApiGames(data.games ?? []);
    } catch {
      setApiGames([]);
    } finally {
      setLoading(false);
    }
  }, [userTelegramInitData]);

  useEffect(() => {
    fetchGames();
  }, [fetchGames]);

  const handleClose = () => {
    triggerHapticFeedback(window);
    onClose();
  };

  const handleGameCardClick = (gameId: string) => {
    triggerHapticFeedback(window);
    setSelectedGameId(gameId);
  };

  const handlePlayFromDetail = () => {
    if (!selectedGameId) return;
    setActiveGameId(selectedGameId);
    setSelectedGameId(null);
  };

  if (activeGameId === 'tap_challenge') {
    return (
      <TapChallengePopup
        onClose={() => setActiveGameId(null)}
        onSuccess={fetchGames}
      />
    );
  }
  if (activeGameId === 'lucky_spin') {
    const g = apiGames.find((x) => x.id === 'lucky_spin');
    return (
      <LuckySpinPopup
        onClose={() => setActiveGameId(null)}
        onSuccess={fetchGames}
        claimedToday={g?.claimedToday ?? false}
      />
    );
  }
  if (activeGameId === 'drums_baobab') {
    return (
      <DrumsOfTheBaobabPopup
        onClose={() => setActiveGameId(null)}
        onSuccess={fetchGames}
      />
    );
  }
  if (activeGameId === 'savanna_hunt') {
    return (
      <SavannaHuntPopup
        onClose={() => setActiveGameId(null)}
        onSuccess={fetchGames}
      />
    );
  }

  const selectedGame = selectedGameId ? getGameById(selectedGameId) : null;
  const availableGames = AFROLUMENS_MINI_GAMES.filter((game) => game.implemented);

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-ura-navy/60 p-0 sm:items-center sm:p-4">
      <div className="max-h-[90dvh] w-full max-w-2xl flex flex-col overflow-hidden animate-slide-up rounded-t-3xl bg-ura-panel shadow-xl sm:max-h-[85vh] sm:animate-none sm:rounded-2xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-ura-border/75 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-white">Mini Games</h2>
            <p className="text-xs text-gray-400">URAPearls Tap2Earn · Tap a game for details</p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-2 rounded-full text-gray-400 hover:text-white text-2xl"
            aria-label="Close"
          >
            &times;
          </button>
        </div>
        <div className="p-4 overflow-y-auto flex-1">
          {loading ? (
            <p className="text-center text-gray-400 py-8">Loading…</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {availableGames.map((game) => {
                return (
                  <button
                    key={game.id}
                    type="button"
                    onClick={() => handleGameCardClick(game.id)}
                    className="flex flex-col items-center text-center p-4 rounded-xl border transition-all bg-ura-panel-2 border-ura-border/75 hover:border-[#f3ba2f]/50 hover:bg-[#2d3038]"
                  >
                    <span className="text-3xl mb-1">{game.emoji}</span>
                    <span className={`text-xs font-medium rounded px-1.5 py-0.5 border mb-1 ${TIER_COLORS[game.tier]}`}>
                      {MINI_GAME_TIER_LABELS[game.tier]}
                    </span>
                    <span className="font-semibold text-white text-sm line-clamp-1">{game.name}</span>
                    <span className="text-xs text-gray-400 line-clamp-2 mt-0.5">{game.description}</span>
                    <span className="text-xs text-gray-500 mt-1">Tap for details</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {selectedGame && (
        <GameDetailModal
          game={selectedGame}
          onClose={() => setSelectedGameId(null)}
          onPlay={handlePlayFromDetail}
        />
      )}
    </div>
  );
}
