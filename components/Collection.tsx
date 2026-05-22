// components/Collection.tsx

/**
 * Collection - cards / badges
 * Unlock by rank, referrals, task, starter
 * Show locked (condition) vs unlocked (bonus)
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { useGameStore } from '@/utils/game-mechanics';
import { imageMap } from '@/images';
import { LEVELS } from '@/utils/consts';

interface CardItem {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  image: string;
  category: string;
  unlockType: string;
  unlockPayload: unknown;
  bonusType: string;
  bonusValue: number;
  owned: boolean;
}

interface CollectionProps {
  setCurrentView?: (view: string) => void;
}

/** Display name overrides for renamed features (Karibu Daily, Decode, Matrix) */
function getCardDisplayName(card: CardItem): string {
  if (card.slug === 'daily_cipher') return 'Decode';
  if (card.slug === 'daily_combo') return 'Matrix';
  return card.name;
}

function getUnlockText(card: CardItem): string {
  const payload = (card.unlockPayload as Record<string, unknown>) ?? {};
  switch (card.unlockType) {
    case 'starter':
      return 'Start playing';
    case 'rank':
      const rankIndex = Number(payload.rankIndex ?? 0);
      const rankName = LEVELS[rankIndex]?.name ?? `Rank ${rankIndex + 1}`;
      return `Unlock at ${rankName}`;
    case 'referrals':
      const count = Number(payload.referralCount ?? 0);
      return `${count} referred friend${count !== 1 ? 's' : ''}`;
    case 'task':
      return 'Complete a task';
    case 'daily_cipher':
      return 'Solve Decode';
    default:
      return 'Unlock';
  }
}

function getBonusText(card: CardItem): string {
  if (card.bonusType === 'none' || !card.bonusValue) return '';
  switch (card.bonusType) {
    case 'profit_percent':
      return `+${card.bonusValue}% profit/hr`;
    case 'max_energy':
      return `+${card.bonusValue} max energy`;
    case 'points_percent':
      return `+${card.bonusValue}% points`;
    default:
      return '';
  }
}

export default function Collection({ setCurrentView }: CollectionProps) {
  const { userTelegramInitData } = useGameStore();
  const [cards, setCards] = useState<CardItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCards = useCallback(async () => {
    if (!userTelegramInitData) {
      setIsLoading(false);
      return;
    }
    try {
      const res = await fetch(`/api/cards?initData=${encodeURIComponent(userTelegramInitData)}`);
      if (res.ok) {
        const data = await res.json();
        setCards(data.cards ?? []);
      }
    } catch {
      setCards([]);
    } finally {
      setIsLoading(false);
    }
  }, [userTelegramInitData]);

  useEffect(() => {
    fetchCards();
  }, [fetchCards]);

  const byCategory = cards.reduce((acc, c) => {
    if (!acc[c.category]) acc[c.category] = [];
    acc[c.category].push(c);
    return acc;
  }, {} as Record<string, CardItem[]>);

  const ownedCount = cards.filter((c) => c.owned).length;

  return (
    <div className="bg-ura-page min-h-screen">
      <div className="w-full max-w-xl mx-auto bg-ura-panel min-h-screen">
        <div className="pt-4 pb-24 px-4">
          <h1 className="text-2xl font-bold text-center text-white mb-2">Collection</h1>
          <p className="text-gray-400 text-center text-sm mb-6">
            {ownedCount} / {cards.length} cards
          </p>

          {isLoading ? (
            <p className="text-gray-400 text-center">Loading cards...</p>
          ) : (
            Object.entries(byCategory).map(([category, items]) => (
              <div key={category} className="mb-8">
                <h2 className="text-lg font-semibold text-[#f3ba2f] mb-4 capitalize">{category}</h2>
                <div className="grid grid-cols-3 gap-3">
                  {items.map((card) => {
                    const img = imageMap[card.image];
                    const owned = card.owned;
                    const displayName = getCardDisplayName(card);
                    const unlockText = getUnlockText(card);
                    const bonusText = getBonusText(card);
                    return (
                      <div
                        key={card.id}
                        className={`rounded-xl p-3 flex flex-col items-center border-2 transition-all ${
                          owned
                            ? 'border-emerald-500/50 bg-emerald-500/10'
                            : 'border-ura-border/75 bg-ura-panel-2 opacity-70'
                        }`}
                      >
                        <div className="w-12 h-12 rounded-lg bg-ura-panel flex items-center justify-center mb-2 overflow-hidden">
                          {img ? (
                            <Image src={img} alt={displayName} width={40} height={40} className="rounded" />
                          ) : (
                            <span className="text-gray-500 text-xs">?</span>
                          )}
                        </div>
                        <span className="text-sm font-medium text-white truncate w-full text-center">{displayName}</span>
                        {owned && bonusText ? (
                          <span className="text-xs text-emerald-400 mt-0.5">{bonusText}</span>
                        ) : !owned ? (
                          <span className="text-xs text-gray-500 mt-0.5 text-center">{unlockText}</span>
                        ) : null}
                        {owned && (
                          <div className="mt-1 w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center">
                            <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}

          {setCurrentView && (
            <div className="mt-6 text-center">
              <button
                onClick={() => setCurrentView('game')}
                className="text-[#f3ba2f] hover:underline text-sm"
              >
                ← Back to Game
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
