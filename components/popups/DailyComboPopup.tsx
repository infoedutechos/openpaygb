'use client';

/**
 * Matrix (Daily Combo) - pick today's 3 cards in the correct order
 */

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { useGameStore } from '@/utils/game-mechanics';
import { formatNumber, triggerHapticFeedback } from '@/utils/ui';
import { notifyPearlBalancesRefresh } from '@/utils/pearl-balance-events';
import { useToast } from '@/contexts/ToastContext';
import { dailyCombo, imageMap } from '@/images';
import { DAILY_COMBO_MAX_ATTEMPTS } from '@/utils/consts';

interface Card {
  slug: string;
  label: string;
  image: string;
  category: string;
}

interface Status {
  cards: Card[];
  attemptsLeft: number;
  claimed: boolean;
  reward: number;
  date: string;
}

interface DailyComboPopupProps {
  onClose?: () => void;
}

export default function DailyComboPopup({ onClose }: DailyComboPopupProps) {
  const { userTelegramInitData, incrementPoints, setPoints, setPointsBalance } = useGameStore();
  const [status, setStatus] = useState<Status | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const showToast = useToast();

  const fetchStatus = useCallback(async () => {
    if (!userTelegramInitData) {
      setIsLoading(false);
      return;
    }
    try {
      const res = await fetch(`/api/daily-combo?initData=${encodeURIComponent(userTelegramInitData)}`);
      if (res.ok) {
        const data = await res.json();
        setStatus({
          cards: data.cards ?? [],
          attemptsLeft: data.attemptsLeft ?? 0,
          claimed: !!data.claimed,
          reward: data.reward ?? 500000,
          date: data.date ?? '',
        });
      }
    } catch {
      setStatus(null);
    } finally {
      setIsLoading(false);
    }
  }, [userTelegramInitData]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const addCard = (slug: string) => {
    if (selected.length >= 3) return;
    triggerHapticFeedback(window);
    setSelected((s) => [...s, slug]);
  };

  const removeAt = (index: number) => {
    triggerHapticFeedback(window);
    setSelected((s) => s.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!userTelegramInitData || selected.length !== 3 || isSubmitting || !status) return;
    setIsSubmitting(true);
    triggerHapticFeedback(window);
    try {
      const res = await fetch('/api/daily-combo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData: userTelegramInitData, selectedSlugs: selected }),
      });
      const data = await res.json();
      if (data.success && data.claimed) {
        incrementPoints(data.reward);
        if (data.points != null) setPoints(data.points);
        if (data.pointsBalance != null) setPointsBalance(data.pointsBalance);
        setStatus((s) => s ? { ...s, claimed: true, attemptsLeft: 0 } : s);
        setSelected([]);
        showToast(data.message || `+${formatNumber(data.reward)} PEARLS!`, 'success');
        notifyPearlBalancesRefresh();
      } else {
        setStatus((s) => s ? { ...s, attemptsLeft: data.attemptsLeft ?? s.attemptsLeft } : s);
        showToast(data.message || data.error || 'Wrong combo', 'error');
        setSelected([]);
      }
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    triggerHapticFeedback(window);
    onClose?.();
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-ura-navy/60 p-0 sm:items-center sm:p-4">
        <div className="flex flex-col items-center gap-4 rounded-t-2xl bg-ura-panel p-8 sm:rounded-xl">
          <div className="w-10 h-10 border-2 border-[#f3ba2f] border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400">Loading Matrix…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ura-navy/60 p-0 sm:items-center sm:p-4">
      <div className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-ura-panel shadow-xl sm:rounded-xl">
        <div className="p-4 border-b border-gray-700 flex justify-between items-center sticky top-0 bg-ura-panel z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-ura-panel-2 flex items-center justify-center">
              <Image src={dailyCombo} alt="Matrix" width={24} height={24} className="rounded" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Matrix</h2>
              <p className="text-xs text-gray-400">Pick today’s 3 cards in order · +{formatNumber(status?.reward ?? 500000)} PEARLS</p>
            </div>
          </div>
          <button type="button" onClick={handleClose} className="text-gray-400 hover:text-white text-2xl w-8 h-8">
            &times;
          </button>
        </div>

        <div className="p-4 space-y-4">
          {!status ? (
            <p className="text-gray-400 text-center py-4">Could not load. Open from Telegram.</p>
          ) : status.claimed ? (
            <div className="text-center py-6 text-emerald-400 font-medium">
              You got it today! Come back tomorrow.
            </div>
          ) : status.attemptsLeft <= 0 ? (
            <div className="text-center py-6 text-amber-400 font-medium">
              No attempts left. Come back tomorrow!
            </div>
          ) : (
            <>
              <div className="flex justify-between text-sm">
                <span className="text-amber-400">Attempts left: {status.attemptsLeft}/{DAILY_COMBO_MAX_ATTEMPTS}</span>
                <span className="text-[#f3ba2f]">+{formatNumber(status.reward)} PEARLS</span>
              </div>

              <div className="bg-ura-panel-2 rounded-xl p-3 min-h-[52px] border border-ura-border/75">
                <p className="text-gray-500 text-xs mb-1">Your combo (click to remove)</p>
                <div className="flex flex-wrap gap-2 items-center">
                  {selected.map((slug, i) => {
                    const card = status.cards.find((c) => c.slug === slug);
                    const imgSrc = card && imageMap[card.image];
                    return (
                      <button
                        key={`${slug}-${i}`}
                        type="button"
                        onClick={() => removeAt(i)}
                        className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-ura-panel text-white text-sm font-medium hover:bg-red-500/20"
                      >
                        {imgSrc ? <Image src={imgSrc} alt={card?.label ?? slug} width={24} height={24} className="rounded object-cover" /> : null}
                        <span>{card?.label ?? slug}</span>
                        <span className="text-gray-400">&times;</span>
                      </button>
                    );
                  })}
                  {selected.length < 3 && <span className="text-gray-500 text-sm py-1.5">Pick {3 - selected.length} more</span>}
                </div>
              </div>

              <p className="text-gray-400 text-sm">Tap a card to add to your combo (order matters):</p>
              <div className="grid grid-cols-4 gap-2">
                {status.cards.map((card) => {
                  const imgSrc = imageMap[card.image];
                  return (
                    <button
                      key={card.slug}
                      type="button"
                      onClick={() => addCard(card.slug)}
                      disabled={selected.length >= 3}
                      className="flex flex-col items-center justify-center gap-1 p-2 rounded-xl bg-ura-panel-2 text-white font-medium border border-ura-border/75 hover:border-[#f3ba2f]/50 disabled:opacity-50 disabled:cursor-not-allowed min-w-0 w-full"
                    >
                      <span className="w-10 h-10 flex items-center justify-center shrink-0 rounded-lg bg-ura-panel overflow-hidden">
                        {imgSrc ? (
                          <Image src={imgSrc} alt={card.label} width={40} height={40} className="rounded-lg object-contain w-10 h-10" />
                        ) : (
                          <span className="text-[10px] text-gray-400">{card.label.slice(0, 2)}</span>
                        )}
                      </span>
                      <span className="text-[10px] font-medium leading-tight text-center line-clamp-2 w-full">{card.label}</span>
                    </button>
                  );
                })}
              </div>
              {status.cards.length === 0 && (
                <p className="text-gray-500 text-sm">No cards in pool. Admin can add cards in Matrix settings.</p>
              )}

              <button
                type="button"
                onClick={handleSubmit}
                disabled={selected.length !== 3 || isSubmitting}
                className="w-full py-3 rounded-xl bg-ura-gold text-black font-bold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Checking…' : 'Submit combo'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
