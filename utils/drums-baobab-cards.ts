/**
 * Drums of the Baobab – Spirit & Innovation card definitions and reward logic.
 * Spirit: rhythm window tolerance + combo duration (forgiveness).
 * Innovation: combo multiplier on reward.
 */

export type SpiritRarity = 'none' | 'common' | 'rare' | 'epic';
export type InnovationTier = 'none' | 'bronze' | 'silver' | 'gold';

export const SPIRIT_CARD: Record<SpiritRarity, { hitWindowMultiplier: number; comboForgiveness: number; label: string }> = {
  none: { hitWindowMultiplier: 1, comboForgiveness: 0, label: 'None' },
  common: { hitWindowMultiplier: 1.15, comboForgiveness: 0, label: 'Common' },
  rare: { hitWindowMultiplier: 1.25, comboForgiveness: 1, label: 'Rare' },
  epic: { hitWindowMultiplier: 1.4, comboForgiveness: 2, label: 'Epic' },
};

export const INNOVATION_CARD: Record<InnovationTier, { maxBonusPercent: number; label: string }> = {
  none: { maxBonusPercent: 0, label: 'None' },
  bronze: { maxBonusPercent: 10, label: 'Bronze' },
  silver: { maxBonusPercent: 20, label: 'Silver' },
  gold: { maxBonusPercent: 30, label: 'Gold' },
};

/** Combo multiplier: 1 + (bonus from combo, capped by card tier). */
export function getComboMultiplier(maxCombo: number, innovationTier: InnovationTier): number {
  if (maxCombo <= 0 || innovationTier === 'none') return 1;
  const { maxBonusPercent } = INNOVATION_CARD[innovationTier];
  const percentPerCombo = maxBonusPercent / 12; // over 12 beats
  const bonusPercent = Math.min(maxBonusPercent, maxCombo * percentPerCombo);
  return 1 + bonusPercent / 100;
}

/** Base hit window ms; Spirit card widens it. */
export function getHitWindowMs(baseMs: number, spiritRarity: SpiritRarity): number {
  return Math.round(baseMs * SPIRIT_CARD[spiritRarity].hitWindowMultiplier);
}

export function getSpiritComboForgiveness(spiritRarity: SpiritRarity): number {
  return SPIRIT_CARD[spiritRarity].comboForgiveness;
}
