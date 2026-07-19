import "server-only";

import { prisma } from "@/lib/prisma";
import { PLATFORM_SITE_UI_KEY } from "@/lib/site-ui-shared";
import { countryDisplayName, utcDayKey, type VisitGeo } from "@/lib/visit-geo";
import { hashVisitorId } from "@/lib/visit-id";
import { normalizeVisitAction, normalizeVisitPath } from "@/lib/visit-path";

export { VISITOR_COOKIE, hashVisitorId, newVisitorId } from "@/lib/visit-id";
export { normalizeVisitPath, normalizeVisitAction } from "@/lib/visit-path";

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
  const path = normalizeVisitPath(opts.path);

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

  let isNewPathUniqueToday = false;
  try {
    await prisma.siteVisitPathSeen.create({
      data: { day, path, visitorKey },
    });
    isNewPathUniqueToday = true;
  } catch {
    isNewPathUniqueToday = false;
  }

  const uniqueInc = isNewUniqueToday ? 1 : 0;
  const pathUniqueInc = isNewPathUniqueToday ? 1 : 0;

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

  try {
    await prisma.siteVisitPathDay.upsert({
      where: { day_path: { day, path } },
      create: { day, path, uniqueVisitors: pathUniqueInc, pageViews: 1 },
      update: {
        pageViews: { increment: 1 },
        ...(pathUniqueInc ? { uniqueVisitors: { increment: 1 } } : {}),
      },
    });
  } catch (err) {
    console.warn("[site-visits] path day upsert skipped", err);
  }

  const pruneBefore = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  void prisma.siteVisitSeen
    .deleteMany({ where: { day: { lt: pruneBefore } } })
    .catch(() => undefined);
  void prisma.siteVisitPathSeen
    .deleteMany({ where: { day: { lt: pruneBefore } } })
    .catch(() => undefined);
  void prisma.siteVisitActionEvent
    .deleteMany({ where: { day: { lt: pruneBefore } } })
    .catch(() => undefined);

  return { ok: true, day, isNewUniqueToday };
}

export async function recordSiteAction(opts: {
  visitorRawId: string;
  path?: string;
  action: string;
}): Promise<{ ok: true; day: string }> {
  const day = utcDayKey();
  const visitorKey = hashVisitorId(opts.visitorRawId);
  const path = normalizeVisitPath(opts.path);
  const action = normalizeVisitAction(opts.action);

  await Promise.all([
    prisma.siteVisitActionDay.upsert({
      where: { day_path_action: { day, path, action } },
      create: { day, path, action, count: 1 },
      update: { count: { increment: 1 } },
    }),
    prisma.siteVisitActionEvent.create({
      data: { day, path, action, visitorKey },
    }),
  ]);

  return { ok: true, day };
}

export type PublicVisitStats = {
  today: { day: string; uniqueVisitors: number; pageViews: number };
  total: { uniqueVisitors: number; pageViews: number };
  showPublic: boolean;
  scope: "ecosystem";
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
    scope: "ecosystem",
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
  pages: Array<{
    path: string;
    todayUnique: number;
    todayViews: number;
    windowUnique: number;
    windowViews: number;
  }>;
  actions: Array<{
    path: string;
    action: string;
    count: number;
  }>;
  recentActions: Array<{
    id: string;
    day: string;
    path: string;
    action: string;
    createdAt: string;
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

  const [
    todayRow,
    totals,
    settings,
    dayRows,
    geoToday,
    geoAll,
    pathToday,
    pathWindow,
    actionRows,
    recentActions,
  ] = await Promise.all([
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
    prisma.siteVisitPathDay
      .findMany({
        where: { day },
        orderBy: [{ pageViews: "desc" }, { uniqueVisitors: "desc" }],
        take: 100,
      })
      .catch(() => [] as Awaited<ReturnType<typeof prisma.siteVisitPathDay.findMany>>),
    prisma.siteVisitPathDay
      .findMany({
        where: { day: { in: window } },
        orderBy: [{ pageViews: "desc" }],
        take: 2000,
      })
      .catch(() => [] as Awaited<ReturnType<typeof prisma.siteVisitPathDay.findMany>>),
    prisma.siteVisitActionDay
      .findMany({
        where: { day: { in: window } },
        orderBy: [{ count: "desc" }],
        take: 500,
      })
      .catch(() => [] as Awaited<ReturnType<typeof prisma.siteVisitActionDay.findMany>>),
    prisma.siteVisitActionEvent
      .findMany({
        orderBy: { createdAt: "desc" },
        take: 100,
      })
      .catch(() => [] as Awaited<ReturnType<typeof prisma.siteVisitActionEvent.findMany>>),
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

  const todayPathMap = new Map(pathToday.map((r) => [r.path, r]));
  const windowPathAgg = new Map<string, { uniqueVisitors: number; pageViews: number }>();
  for (const r of pathWindow) {
    const cur = windowPathAgg.get(r.path) ?? { uniqueVisitors: 0, pageViews: 0 };
    cur.uniqueVisitors += r.uniqueVisitors;
    cur.pageViews += r.pageViews;
    windowPathAgg.set(r.path, cur);
  }
  const allPaths = new Set([...todayPathMap.keys(), ...windowPathAgg.keys()]);
  const pages = [...allPaths]
    .map((path) => {
      const t = todayPathMap.get(path);
      const w = windowPathAgg.get(path);
      return {
        path,
        todayUnique: t?.uniqueVisitors ?? 0,
        todayViews: t?.pageViews ?? 0,
        windowUnique: w?.uniqueVisitors ?? 0,
        windowViews: w?.pageViews ?? 0,
      };
    })
    .sort((a, b) => b.windowViews - a.windowViews || b.todayViews - a.todayViews)
    .slice(0, 80);

  const actionAgg = new Map<string, { path: string; action: string; count: number }>();
  for (const r of actionRows) {
    const key = `${r.path}\0${r.action}`;
    const cur = actionAgg.get(key) ?? { path: r.path, action: r.action, count: 0 };
    cur.count += r.count;
    actionAgg.set(key, cur);
  }
  const actions = [...actionAgg.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 120);

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
    pages,
    actions,
    recentActions: recentActions.map((e) => ({
      id: e.id,
      day: e.day,
      path: e.path,
      action: e.action,
      createdAt: e.createdAt.toISOString(),
    })),
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
