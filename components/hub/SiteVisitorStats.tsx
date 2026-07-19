"use client";

import { useEffect, useState } from "react";
import { readJsonResponse } from "@/utils/read-json-response";

type Stats = {
  showPublic: boolean;
  today: { day: string; uniqueVisitors: number; pageViews: number } | null;
  total: { uniqueVisitors: number; pageViews: number } | null;
};

function formatCount(n: number): string {
  return n.toLocaleString();
}

/** Public home/lobby visitor strip — daily + lifetime unique visitors. */
export function SiteVisitorStats() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const r = await fetch("/api/public/visit-stats", { cache: "no-store" });
        const parsed = await readJsonResponse<Stats>(r);
        if (!parsed.ok || cancelled) return;
        setStats(parsed.data);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!stats?.showPublic || !stats.today || !stats.total) return null;

  return (
    <section
      aria-label="Site visitors"
      className="rounded-2xl border border-cyan-500/25 bg-cyan-950/20 px-4 py-3 sm:px-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-200/90">
          Visitors
        </p>
        <p className="text-[10px] text-slate-500">Whole ecosystem · UTC · unique browsers</p>
      </div>
      <dl className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div>
          <dt className="text-[11px] text-slate-500">Today</dt>
          <dd className="text-lg font-semibold text-white tabular-nums">
            {formatCount(stats.today.uniqueVisitors)}
          </dd>
        </div>
        <div>
          <dt className="text-[11px] text-slate-500">Today page views</dt>
          <dd className="text-lg font-semibold text-slate-200 tabular-nums">
            {formatCount(stats.today.pageViews)}
          </dd>
        </div>
        <div>
          <dt className="text-[11px] text-slate-500">Total visitors</dt>
          <dd className="text-lg font-semibold text-white tabular-nums">
            {formatCount(stats.total.uniqueVisitors)}
          </dd>
        </div>
        <div>
          <dt className="text-[11px] text-slate-500">Total page views</dt>
          <dd className="text-lg font-semibold text-slate-200 tabular-nums">
            {formatCount(stats.total.pageViews)}
          </dd>
        </div>
      </dl>
    </section>
  );
}
