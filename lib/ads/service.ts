import { prisma } from "@/lib/prisma";
import {
  DEFAULT_AD_PLACEMENTS,
  type AdTargeting,
} from "@/lib/ads/types";
import { debitOpgb } from "@/lib/opgb-ledger";

export async function ensureAdPlatformSettings() {
  const existing = await prisma.adPlatformSettings.findUnique({ where: { key: "platform" } });
  if (existing) return existing;
  return prisma.adPlatformSettings.create({
    data: { key: "platform" },
  });
}

export async function ensureDefaultAdPlacements() {
  for (const p of DEFAULT_AD_PLACEMENTS) {
    await prisma.adPlacement.upsert({
      where: { code: p.code },
      create: {
        code: p.code,
        title: p.title,
        description: p.description,
        surface: p.surface,
        hub: p.hub,
        isActive: true,
      },
      update: {
        title: p.title,
        description: p.description,
        surface: p.surface,
        hub: p.hub,
      },
    });
  }
  return prisma.adPlacement.findMany({ orderBy: { code: "asc" } });
}

export function parseAdTargeting(raw: string | null | undefined): AdTargeting {
  if (!raw?.trim()) return {};
  try {
    const v = JSON.parse(raw) as AdTargeting;
    return v && typeof v === "object" ? v : {};
  } catch {
    return {};
  }
}

export function stringifyAdTargeting(t: AdTargeting | null | undefined): string {
  return JSON.stringify(t ?? {});
}

export function utcDayKey(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

export async function recordAdModeration(input: {
  campaignId: string;
  actorId: string;
  action: string;
  note?: string;
}) {
  return prisma.adModerationEvent.create({
    data: {
      campaignId: input.campaignId,
      actorId: input.actorId,
      action: input.action,
      note: input.note?.trim() ?? "",
    },
  });
}

export async function recordAdDeliveryEvent(input: {
  campaignId: string;
  kind: string;
  surface?: "web_dashboard" | "web_hub" | "telegram_bot" | "telegram_channel" | "telegram_mini_app";
  viewerKey?: string;
  meta?: Record<string, unknown>;
}) {
  const event = await prisma.adDeliveryEvent.create({
    data: {
      campaignId: input.campaignId,
      kind: input.kind,
      surface: input.surface,
      viewerKey: input.viewerKey ?? "",
      metaJson: JSON.stringify(input.meta ?? {}),
    },
  });
  if (input.kind === "impression") {
    await prisma.adCampaign.update({
      where: { id: input.campaignId },
      data: { impressions: { increment: 1 } },
    });
  } else if (input.kind === "click") {
    await prisma.adCampaign.update({
      where: { id: input.campaignId },
      data: { clicks: { increment: 1 } },
    });
  }
  return event;
}

/**
 * Live OpenPayGB debit when billingStudentId is set; always writes AdSpendEntry.
 */
export async function recordAdSpend(input: {
  campaignId: string;
  amountMinor: number;
  platformFeeBps: number;
  memo?: string;
}) {
  const campaign = await prisma.adCampaign.findUnique({ where: { id: input.campaignId } });
  if (!campaign) throw new Error("Campaign not found");

  const fee = Math.max(0, Math.round((input.amountMinor * input.platformFeeBps) / 10_000));
  const referenceKey = `ad_spend:${input.campaignId}:${Date.now()}`;
  const day = utcDayKey();

  let ledgerOk = false;
  if (campaign.billingStudentId && campaign.organizationId) {
    const result = await debitOpgb({
      studentId: campaign.billingStudentId,
      organizationId: campaign.organizationId,
      amountUgx: input.amountMinor,
      kind: "ad_spend",
      referenceKey,
      sourceRail: "ads",
      memo: input.memo ?? `Ad spend · ${campaign.name}`,
    });
    ledgerOk = result.ok;
    if (!result.ok) {
      throw new Error("OpenPayGB debit failed — insufficient balance or duplicate");
    }
  }

  const entry = await prisma.adSpendEntry.create({
    data: {
      campaignId: input.campaignId,
      amountMinor: input.amountMinor,
      platformFeeMinor: fee,
      referenceKey,
      ledgerKind: ledgerOk ? "ad_spend" : "ad_spend_unbilled",
      memo: input.memo ?? "",
    },
  });

  const sameDay = campaign.spentTodayDay === day;
  await prisma.adCampaign.update({
    where: { id: input.campaignId },
    data: {
      spentMinor: { increment: input.amountMinor },
      spentTodayDay: day,
      spentTodayMinor: sameDay ? { increment: input.amountMinor } : input.amountMinor,
    },
  });

  return entry;
}

/** @deprecated alias */
export const recordAdSpendStub = recordAdSpend;

export async function getAdsAnalyticsSummary() {
  const [campaigns, impressions, clicks, spendAgg] = await Promise.all([
    prisma.adCampaign.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.adDeliveryEvent.count({ where: { kind: "impression" } }),
    prisma.adDeliveryEvent.count({ where: { kind: "click" } }),
    prisma.adSpendEntry.aggregate({ _sum: { amountMinor: true, platformFeeMinor: true } }),
  ]);
  return {
    byStatus: Object.fromEntries(campaigns.map((c) => [c.status, c._count._all])),
    impressions,
    clicks,
    spendMinor: spendAgg._sum.amountMinor ?? 0,
    platformFeeMinor: spendAgg._sum.platformFeeMinor ?? 0,
  };
}

/** Pause active campaigns that exhausted budget, daily cap, or schedule end. */
export async function autoPauseExhaustedCampaigns(): Promise<{ paused: number }> {
  const day = utcDayKey();
  const now = new Date();
  const active = await prisma.adCampaign.findMany({
    where: { status: "active" },
    take: 500,
  });
  let paused = 0;
  for (const c of active) {
    const spentToday = c.spentTodayDay === day ? c.spentTodayMinor : 0;
    const overBudget = c.budgetMinor > 0 && c.spentMinor >= c.budgetMinor;
    const overDaily = c.dailyCapMinor > 0 && spentToday >= c.dailyCapMinor;
    const ended = c.endsAt != null && c.endsAt.getTime() < now.getTime();
    if (overBudget || overDaily || ended) {
      await prisma.adCampaign.update({
        where: { id: c.id },
        data: { status: overBudget || ended ? "completed" : "paused" },
      });
      await recordAdModeration({
        campaignId: c.id,
        actorId: "cron:ads-auto-pause",
        action: overBudget || ended ? "cancel" : "pause",
        note: overBudget
          ? "Auto-completed: budget exhausted"
          : ended
            ? "Auto-completed: schedule ended"
            : "Auto-paused: daily cap reached",
      });
      paused += 1;
    }
  }
  return { paused };
}

export function campaignMatchesTargeting(
  targeting: AdTargeting,
  opts: { hub?: string; role?: string; organizationId?: string },
): boolean {
  if (targeting.hubs?.length) {
    const hub = opts.hub ?? "all";
    if (!targeting.hubs.includes("all") && !targeting.hubs.includes(hub)) return false;
  }
  if (targeting.roles?.length && opts.role) {
    if (!targeting.roles.includes(opts.role)) return false;
  }
  if (targeting.organizationIds?.length && opts.organizationId) {
    if (!targeting.organizationIds.includes(opts.organizationId)) return false;
  }
  return true;
}
