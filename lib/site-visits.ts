import "server-only";

import { prisma } from "@/lib/prisma";
import { PLATFORM_SITE_UI_KEY } from "@/lib/site-ui-shared";
import { countryDisplayName, utcDayKey, type VisitGeo } from "@/lib/visit-geo";
import { hashVisitorId } from "@/lib/visit-id";

export { VISITOR_COOKIE, hashVisitorId, newVisitorId } from "@/lib/visit-id";

const TOTALS_KEY = "platform";

export type RecordVisitResult = {
  ok: true;
  day: string;
  isNewUniqueToday: boolean;
};

export async function recordSiteVisit(opts: {
  visitorRawId: string;
  geo: VisitGeo;
  path?: string;
}): Promise<RecordVisitResult> {
  const day = utcDayKey();
  const visitorKey = hashVisitorId(opts.visitorRawId);
  const countryCode = opts.geo.countryCode || "XX";
  const location = opts.geo.location?.trim() || "";

  let isNewUniqueToday = false;
  try {
    await prisma.siteVisitSeen.create({
      data: {
        day,
        visitorKey,
        countryCode,
        location,
      },
    });
    isNewUniqueToday = true;
  } catch {
    isNewUniqueToday = false;
  }

  const uniqueInc = isNewUniqueToday ? 1 : 0;

  await Promise.all([
    prisma.siteVisitDay.upsert({
      where: { day },
      create: { day, uniqueVisitors: uniqueInc, pageViews: 1 },
      update: {
        pageViews: { increment: 1 },
        ...(uniqueInc ? { uniqueVisitors: { increment: 1 } } : {}),
      },
    }),
    prisma.siteVisitTotals.upsert({
      where: { key: TOTALS_KEY },
      create: { key: TOTALS_KEY, uniqueVisitors: uniqueInc, pageViews: 1 },
      update: {
        pageViews: { increment: 1 },
        ...(uniqueInc ? { uniqueVisitors: { increment: 1 } } : {}),
      },
    }),
    prisma.siteVisitGeoDay.upsert({
      where: {
        day_countryCode_location: { day, countryCode, location },
      },
      create: {
        day,
        countryCode,
        location,
        uniqueVisitors: uniqueInc,
        pageViews: 1,
      },
      update: {
        pageViews: { increment: 1 },
        ...(uniqueInc ? { uniqueVisitors: { increment: 1 } } : {}),
      },
    }),
  ]);

  // Best-effort prune of old dedupe rows (keep ~14 days).
  const pruneBefore = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  void prisma.siteVisitSeen
    .deleteMany({ where: { day: { lt: pruneBefore } } })
    .catch(() => undefined);

  return { ok: true, day, isNewUniqueToday };
}

export type PublicVisitStats = {
  today: { day: string; uniqueVisitors: number; pageViews: number };
  total: { uniqueVisitors: number; pageViews: number };
  showPublic: boolean;
};

export async function getPublicVisitStats(): Promise<PublicVisitStats> {
  const day = utcDayKey();
  const [todayRow, totals, settings] = await Promise.all([
    prisma.siteVisitDay.findUnique({ where: { day } }),
    prisma.siteVisitTotals.findUnique({ where: { key: TOTALS_KEY } }),
    prisma.siteUiSettings.findUnique({
      where: { key: PLATFORM_SITE_UI_KEY },
      select: { showPublicVisitorStats: true },
    }),
  ]);

  return {
    today: {
      day,
      uniqueVisitors: todayRow?.uniqueVisitors ?? 0,
      pageViews: todayRow?.pageViews ?? 0,
    },
    total: {
      uniqueVisitors: totals?.uniqueVisitors ?? 0,
      pageViews: totals?.pageViews ?? 0,
    },
    showPublic: settings?.showPublicVisitorStats !== false,
  };
}

export type MasterVisitStats = {
  today: { day: string; uniqueVisitors: number; pageViews: number };
  total: { uniqueVisitors: number; pageViews: number };
  showPublicVisitorStats: boolean;
  last30Days: Array<{ day: string; uniqueVisitors: number; pageViews: number }>;
  countriesToday: Array<{
    countryCode: string;
    countryName: string;
    location: string;
    uniqueVisitors: number;
    pageViews: number;
  }>;
  countriesAllTime: Array<{
    countryCode: string;
    countryName: string;
    uniqueVisitors: number;
    pageViews: number;
  }>;
  topLocations: Array<{
    countryCode: string;
    countryName: string;
    location: string;
    uniqueVisitors: number;
    pageViews: number;
  }>;
};

function daysAgoKeys(n: number): string[] {
  const out: string[] = [];
  const now = Date.now();
  for (let i = 0; i < n; i++) {
    out.push(new Date(now - i * 24 * 60 * 60 * 1000).toISOString().slice(0, 10));
  }
  return out;
}

export async function getMasterVisitStats(): Promise<MasterVisitStats> {
  const day = utcDayKey();
  const window = daysAgoKeys(30);

  const [todayRow, totals, settings, dayRows, geoToday, geoAll] = await Promise.all([
    prisma.siteVisitDay.findUnique({ where: { day } }),
    prisma.siteVisitTotals.findUnique({ where: { key: TOTALS_KEY } }),
    prisma.siteUiSettings.findUnique({
      where: { key: PLATFORM_SITE_UI_KEY },
      select: { showPublicVisitorStats: true },
    }),
    prisma.siteVisitDay.findMany({
      where: { day: { in: window } },
      orderBy: { day: "desc" },
    }),
    prisma.siteVisitGeoDay.findMany({
      where: { day },
      orderBy: [{ uniqueVisitors: "desc" }, { pageViews: "desc" }],
      take: 50,
    }),
    prisma.siteVisitGeoDay.findMany({
      orderBy: [{ uniqueVisitors: "desc" }, { pageViews: "desc" }],
      take: 500,
    }),
  ]);

  const dayMap = new Map(dayRows.map((r) => [r.day, r]));
  const last30Days = window.map((d) => ({
    day: d,
    uniqueVisitors: dayMap.get(d)?.uniqueVisitors ?? 0,
    pageViews: dayMap.get(d)?.pageViews ?? 0,
  }));

  const countryAgg = new Map<string, { uniqueVisitors: number; pageViews: number }>();
  for (const g of geoAll) {
    const cur = countryAgg.get(g.countryCode) ?? { uniqueVisitors: 0, pageViews: 0 };
    cur.uniqueVisitors += g.uniqueVisitors;
    cur.pageViews += g.pageViews;
    countryAgg.set(g.countryCode, cur);
  }
  const countriesAllTime = [...countryAgg.entries()]
    .map(([countryCode, v]) => ({
      countryCode,
      countryName: countryDisplayName(countryCode),
      uniqueVisitors: v.uniqueVisitors,
      pageViews: v.pageViews,
    }))
    .sort((a, b) => b.uniqueVisitors - a.uniqueVisitors || b.pageViews - a.pageViews)
    .slice(0, 40);

  const countriesToday = geoToday.map((g) => ({
    countryCode: g.countryCode,
    countryName: countryDisplayName(g.countryCode),
    location: g.location,
    uniqueVisitors: g.uniqueVisitors,
    pageViews: g.pageViews,
  }));

  const topLocations = geoAll
    .filter((g) => g.location.trim())
    .map((g) => ({
      countryCode: g.countryCode,
      countryName: countryDisplayName(g.countryCode),
      location: g.location,
      uniqueVisitors: g.uniqueVisitors,
      pageViews: g.pageViews,
    }))
    .sort((a, b) => b.uniqueVisitors - a.uniqueVisitors || b.pageViews - a.pageViews)
    .slice(0, 40);

  return {
    today: {
      day,
      uniqueVisitors: todayRow?.uniqueVisitors ?? 0,
      pageViews: todayRow?.pageViews ?? 0,
    },
    total: {
      uniqueVisitors: totals?.uniqueVisitors ?? 0,
      pageViews: totals?.pageViews ?? 0,
    },
    showPublicVisitorStats: settings?.showPublicVisitorStats !== false,
    last30Days,
    countriesToday,
    countriesAllTime,
    topLocations,
  };
}

export async function setShowPublicVisitorStats(show: boolean): Promise<boolean> {
  await prisma.siteUiSettings.upsert({
    where: { key: PLATFORM_SITE_UI_KEY },
    create: { key: PLATFORM_SITE_UI_KEY, showPublicVisitorStats: show },
    update: { showPublicVisitorStats: show },
  });
  return show;
}
