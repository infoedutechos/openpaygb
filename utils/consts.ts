// utils/consts.ts

/**
 * This project was developed by Open Innovations Platforms and Technologies.
 *
 * Copyright (c) Open Innovations Platforms and Technologies. All rights reserved.
 * See utils/company-info.ts for official links and the license text returned by /api/license.
 */

import { mainCharacter, rankBlue, rankGold, rankSilver, rankWhite } from "@/images";
import { StaticImageData } from "next/image";

export const ALLOW_ALL_DEVICES = true;

/** White pearls required for 1 golden (goldish) pearl — buy/sell/convert (must match wallet + API). */
export const WHITE_TO_GOLDISH_RATE = 1_000_000;
/** Approved blue pearls batch size per 1 goldish (admin / treasury conversion). */
export const BLUE_TO_GOLDISH_RATE = 25;

/** @deprecated Use getTonConnectManifestUrl() from @/lib/tonconnect-manifest-url — do not use external IPFS manifests. */
export const WALLET_MANIFEST_URL = "";

export interface LevelData {
  name: string;
  minPoints: number;
  minTaps: number;
  bigImage: StaticImageData;
  smallImage: StaticImageData;
  color: string;
  primaryColor: string;
  accentColor: string;
  friendBonus: number;
  friendBonusPremium: number;
}

export const LEVELS: LevelData[] = [
  { name: "Citizen", minPoints: 0, minTaps: 0, bigImage: mainCharacter, smallImage: rankWhite, color: "#E8ECF5", primaryColor: "#566178", accentColor: "#BFC8D8", friendBonus: 0, friendBonusPremium: 0 },
  { name: "Contributor", minPoints: 500000, minTaps: 1000, bigImage: mainCharacter, smallImage: rankSilver, color: "#C9CFDA", primaryColor: "#69758C", accentColor: "#D8DFED", friendBonus: 20000, friendBonusPremium: 25000 },
  { name: "Validator", minPoints: 2500000, minTaps: 5000, bigImage: mainCharacter, smallImage: rankBlue, color: "#5C88E8", primaryColor: "#2B4F98", accentColor: "#86B4FF", friendBonus: 30000, friendBonusPremium: 50000 },
  { name: "Guardian", minPoints: 15000000, minTaps: 25000, bigImage: mainCharacter, smallImage: rankGold, color: "#F3BA2F", primaryColor: "#6E5214", accentColor: "#FFD36A", friendBonus: 40000, friendBonusPremium: 75000 },
];

/** Karibu Daily: white pearls per consecutive day (day 1 … day 10). */
export const DAILY_REWARDS = [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000];

export const MAXIMUM_INACTIVE_TIME_FOR_MINE = 3*60*60*1000; // 3 hours in milliseconds

export const MAX_ENERGY_REFILLS_PER_DAY = 6;
export const ENERGY_REFILL_COOLDOWN = 60 * 60 * 1000; // 1 hour in milliseconds
export const TASK_WAIT_TIME = 5 * 60 * 1000; // 5 minutes in milliseconds

/** Earn tab Activities: tab labels. Admin tasks should use these categories. */
export const ACTIVITY_TAB_CATEGORIES = ['Special', 'Leagues', 'Refs'] as const;

// Leagues – tiered system + user-created leagues
export const LEAGUE_TIERS = ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Legend'] as const;
export type LeagueTier = (typeof LEAGUE_TIERS)[number];
/** Base points per action: users in a team get these as TP; users in a league get TP + (base × LEAGUE_POINTS_MULTIPLIER) as LP */
export const LEAGUE_POINTS = {
  dailyLogin: 10,
  taskComplete: 20,
  attendEvent: 50,   // e.g. Attend X-Space
  referral: 100,
  miniGameWin: 200,  // Win challenge (Umeme Run / Lucky Spin)
  streakPerDay: 5,
} as const;
/** Championship: every 8 weeks; top 100 Diamond & Legend qualify */
export const LEAGUE_CHAMPIONSHIP_WEEKS = 8;
export const LEAGUE_CHAMPIONSHIP_TOP = 100;
export const LEAGUE_CUSTOM_MAX_MEMBERS = 50;
export const LEAGUE_INVITE_CODE_LENGTH = 8;
/** PEARLS commitment required to create a team (1M PEARLS; team is lower rank than league; recorded as team_commitment) */
export const TEAM_CREATION_FEE = 1_000_000;
/** Team size: total members = creator + members. Min 2 (creator + 1 member), max 7. */
export const TEAM_MIN_MEMBERS = 2;
export const TEAM_MAX_MEMBERS = 7;
/** PEARLS commitment required to create a league (10M PEARLS; only teams can create leagues; recorded as league_commitment) */
export const LEAGUE_CREATION_FEE = 10_000_000;
/** League members get 2× base as LP for the same activity (e.g. 10 TP → 10 TP + 20 LP) */
export const LEAGUE_POINTS_MULTIPLIER = 2;
/** Minimum number of teams in a league to allow league task creation */
export const MIN_TEAMS_FOR_LEAGUE_TASK = 2;

// League Competition (league vs league) challenges
export const LEAGUE_CHALLENGE_MIN_STAKE = 1_000_000;
export const LEAGUE_CHALLENGE_MAX_STAKE = 500_000_000;
export const LEAGUE_CHALLENGE_MIN_TARGET_PEARLS = 10_000_000;
export const LEAGUE_CHALLENGE_MAX_TARGET_PEARLS = 1_000_000_000;
export const LEAGUE_CHALLENGE_MIN_DAYS = 1;
export const LEAGUE_CHALLENGE_MAX_DAYS = 14;
export const LEAGUE_CHALLENGE_MIN_CONTRIBUTION = 100_000;

// Team vs Team challenges (same ranges as league)
export const TEAM_CHALLENGE_MIN_STAKE = 1_000_000;
export const TEAM_CHALLENGE_MAX_STAKE = 500_000_000;
export const TEAM_CHALLENGE_MIN_TARGET_PEARLS = 10_000_000;
export const TEAM_CHALLENGE_MAX_TARGET_PEARLS = 1_000_000_000;
export const TEAM_CHALLENGE_MIN_DAYS = 1;
export const TEAM_CHALLENGE_MAX_DAYS = 14;
export const TEAM_CHALLENGE_MIN_CONTRIBUTION = 100_000;

// Global joinable tasks (taps, tiers, invites) – teams/leagues join with stake; management adds 2x bonus
export const GLOBAL_TASK_MIN_STAKE = 100_000;
export const GLOBAL_TASK_MAX_STAKE = 500_000_000;
export const GLOBAL_TASK_MAX_DURATION_DAYS = 20;

// Daily Cipher
export const DAILY_CIPHER_MAX_ATTEMPTS = 3;
export const DAILY_CIPHER_REWARD = 500000; // PEARLS points for solving (Decode)

// Daily Combo (Matrix)
export const DAILY_COMBO_MAX_ATTEMPTS = 3;
export const DAILY_COMBO_REWARD = 500000; // PEARLS for correct 3-card combo

// Staking - minimum period 1 week (7d); packages with min amount each (max 25%, max 6 months)
export const STAKING_PACKAGES = [
  { id: '7d', hours: 168, bonusPercent: 8, label: '7d', minAmount: 1_000 },
  { id: '10d', hours: 240, bonusPercent: 10, label: '10d', minAmount: 250_000 },
  { id: '14d', hours: 336, bonusPercent: 12, label: '14d', minAmount: 500_000 },
  { id: '21d', hours: 504, bonusPercent: 15, label: '21d', minAmount: 1_000_000 },
  { id: '30d', hours: 720, bonusPercent: 18, label: '30d', minAmount: 5_000_000 },
  { id: '45d', hours: 1080, bonusPercent: 20, label: '45d', minAmount: 25_000_000 },
  { id: '60d', hours: 1440, bonusPercent: 22, label: '60d', minAmount: 100_000_000 },
  { id: '90d', hours: 2160, bonusPercent: 24, label: '90d', minAmount: 500_000_000 },
  { id: '120d', hours: 2880, bonusPercent: 25, label: '120d', minAmount: 2_000_000_000 },
  { id: '150d', hours: 3600, bonusPercent: 25, label: '150d', minAmount: 500_000_000_000 },
  { id: '180d', hours: 4320, bonusPercent: 25, label: '180d', minAmount: 1_000_000_000_000 },
] as const;

// Backward compat - STAKING_DURATIONS for API lookup
export const STAKING_DURATIONS = STAKING_PACKAGES;

// Weekly Event - default tiers (admin can override per week), 16 tiers
// referrals = new referrals this week only (level 1 = 1, level 2 = 2, ... level 16 = 16; +1 per level)
export const WEEKLY_EVENT_DEFAULT_TIERS = [
  { taps: 5_000, tasks: 2, referrals: 1, reward: 100_000 },
  { taps: 15_000, tasks: 5, referrals: 2, reward: 150_000 },
  { taps: 25_000, tasks: 8, referrals: 3, reward: 250_000 },
  { taps: 40_000, tasks: 10, referrals: 4, reward: 400_000 },
  { taps: 60_000, tasks: 12, referrals: 5, reward: 600_000 },
  { taps: 85_000, tasks: 14, referrals: 6, reward: 850_000 },
  { taps: 115_000, tasks: 16, referrals: 7, reward: 1_150_000 },
  { taps: 150_000, tasks: 18, referrals: 8, reward: 1_500_000 },
  { taps: 190_000, tasks: 20, referrals: 9, reward: 1_900_000 },
  { taps: 235_000, tasks: 22, referrals: 10, reward: 2_350_000 },
  { taps: 285_000, tasks: 24, referrals: 11, reward: 2_850_000 },
  { taps: 340_000, tasks: 26, referrals: 12, reward: 3_400_000 },
  { taps: 400_000, tasks: 28, referrals: 13, reward: 4_000_000 },
  { taps: 465_000, tasks: 30, referrals: 14, reward: 4_650_000 },
  { taps: 535_000, tasks: 32, referrals: 15, reward: 5_350_000 },
  { taps: 610_000, tasks: 34, referrals: 16, reward: 6_100_000 },
] as const;

// Lucky Spin: 10 segments, rewards (max 500k). Index 0 = top segment, clockwise.
export const LUCKY_SPIN_SEGMENT_REWARDS = [
  5_000, 10_000, 15_000, 25_000, 50_000, 75_000, 100_000, 200_000, 350_000, 500_000,
] as const;

// Mini games (once per day each)
export const TAP_CHALLENGE_MAX_ATTEMPTS = 3; // Umeme Run: 3 trials per day, persisted
export const MINI_GAMES = {
  tap_challenge: { name: 'Umeme Run', reward: 25000, targetTaps: 18, timeSeconds: 3, description: 'Tap 18 times in 3 seconds' },
  lucky_spin: {
    name: 'Lucky Spin',
    description: 'Spin the wheel for a random reward',
    segmentRewards: LUCKY_SPIN_SEGMENT_REWARDS,
    segmentCount: 10,
  },
  drums_baobab: { name: 'Drums of the Baobab', reward: 30000, description: 'Tap to the beat; accuracy % determines reward', minAccuracyPercent: 50 },
  savanna_hunt: {
    name: 'Savanna Hunt',
    description: 'Tap antelope for points; avoid sacred animals',
    maxSessionsPerDay: 5,
    sessionDurationSeconds: 30,
    baseRewardPerPoint: 80,
    maxReward: 40000,
    minScoreToClaim: 5,
  },
  pattern_dots: {
    name: 'Daily Pattern',
    description: 'Draw the correct pattern on the 9 dots',
    reward: 1_000_000,
  },
} as const;

export const PATTERN_DOTS_REWARD = 1_000_000;
/** Daily Pattern: grid has 12 selectable dots (4x3). */
export const PATTERN_GRID_SIZE = 12;
/** Daily Pattern: min and max dots in a pattern. */
export const PATTERN_MIN_DOTS = 4;
export const PATTERN_MAX_DOTS = 12;

export const REFERRAL_BONUS_BASE = 5000;
export const REFERRAL_BONUS_PREMIUM = 25000;

/** Quiz: default PEARLS reward (admin can set per-question points and completion bonus) */
export const MITROLABS_QUIZ_REWARD_POINTS = 1_000;
/** Max multiple-choice options per question (2–4) */
export const MITROLABS_QUIZ_MAX_OPTIONS = 4;

// Marketplace (points-only now; pay with money coming later)
export const MARKETPLACE_FEE_PERCENT = 2; // seller pays 2% fee
export const MARKETPLACE_MIN_LISTING = 1000; // min PEARLS per listing

// P2P Transfers (Send/Receive PEARLS)
export const DONATION_MIN = 100_000; // 100k PEARLS minimum per charity donation

export const TRANSFER_MIN = 500_000; // 500k PEARLS minimum per transfer
export const TRANSFER_MAX = 10_000_000; // 10M PEARLS maximum per transfer
export const TRANSFER_DAILY_LIMIT = 50_000_000; // 50M PEARLS daily sending limit per user
export const TRANSFER_FEE_PERCENT = 5.5;
export const TRANSFER_FEE_RECIPIENT_TELEGRAM_ID = '5930935506';

// Multitap
export const multitapUpgradeBasePrice = 1000;
export const multitapUpgradeCostCoefficient = 2;

export const multitapUpgradeBaseBenefit = 1;
export const multitapUpgradeBenefitCoefficient = 1;

// Energy
export const energyUpgradeBasePrice = 1000;
export const energyUpgradeCostCoefficient = 2;

export const energyUpgradeBaseBenefit = 500;
export const energyUpgradeBenefitCoefficient = 1;

// Mine (profit per hour)
export const mineUpgradeBasePrice = 1000;
export const mineUpgradeCostCoefficient = 1.5;

export const mineUpgradeBaseBenefit = 100;
export const mineUpgradeBenefitCoefficient = 1.2;