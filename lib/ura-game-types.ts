/**
 * Client-safe mirrors of URA / Play Hub Prisma models.
 * Do not import `@prisma/client` from `"use client"` admin or play UI.
 */

export const TaskType = {
  VISIT: "VISIT",
  TELEGRAM: "TELEGRAM",
  REFERRAL: "REFERRAL",
  REDEEM_CODE: "REDEEM_CODE",
} as const;

export type TaskType = (typeof TaskType)[keyof typeof TaskType];

export type UraTask = {
  id: string;
  title: string;
  description: string;
  points: number;
  type: TaskType;
  category: string;
  image: string;
  callToAction: string;
  taskData: unknown;
  isActive: boolean;
  isHidden: boolean;
};

/** Fields exportable from bot users (subset of Prisma `User`). */
export type BotExportField =
  | "telegramId"
  | "name"
  | "isPremium"
  | "points"
  | "pointsBalance"
  | "multitapLevelIndex"
  | "energy"
  | "energyRefillsLeft"
  | "energyLimitLevelIndex"
  | "mineLevelIndex"
  | "lastPointsUpdateTimestamp"
  | "lastEnergyUpdateTimestamp"
  | "lastEnergyRefillsTimestamp"
  | "tonWalletAddress"
  | "referralPointsEarned"
  | "offlinePointsEarned";

export const BOT_EXPORT_FIELDS: BotExportField[] = [
  "telegramId",
  "name",
  "isPremium",
  "points",
  "pointsBalance",
  "multitapLevelIndex",
  "energy",
  "energyRefillsLeft",
  "energyLimitLevelIndex",
  "mineLevelIndex",
  "lastPointsUpdateTimestamp",
  "lastEnergyUpdateTimestamp",
  "lastEnergyRefillsTimestamp",
  "tonWalletAddress",
  "referralPointsEarned",
  "offlinePointsEarned",
];
