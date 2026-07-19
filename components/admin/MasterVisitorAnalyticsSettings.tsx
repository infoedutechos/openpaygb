"use client";

import { useCallback, useEffect, useState } from "react";
import { readJsonResponse } from "@/utils/read-json-response";

type MasterVisitStats = {
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
  pages?: Array<{
    path: string;
    todayUnique: number;
    todayViews: number;
    windowUnique: number;
    windowViews: number;
  }>;
  actions?: Array<{
    path: string;
    action: string;
    count: number;
  }>;
  recentActions?: Array<{
    id: string;
    day: string;
    path: string;
    action: string;
    createdAt: string;
  }>;
};

function fmt(n: number) {
  return n.toLocaleString();
}

export function MasterVisitorAnalyticsSettings() {
  const [data, setData] = useState<MasterVisitStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch("/api/master/visitor-stats", { credentials: "include" });
      const parsed = await readJsonResponse<MasterVisitStats>(r);
      if (!parsed.ok) throw new Error(parsed.error);
      setData(parsed.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load visitor analytics");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function togglePublic(next: boolean) {
    setBusy(true);
    setError(null);
    setSaved(null);
    try {
      const r = await fetch("/api/master/visitor-stats", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ showPublicVisitorStats: next }),
      });
      const parsed = await readJsonResponse<MasterVisitStats>(r);
      if (!parsed.ok) throw new Error(parsed.error);
      setData(parsed.data);
      setSaved(
        next
          ? "Home page visitor strip is visible."
          : "Home page visitor strip is hidden.",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update setting");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      id="visitor-analytics"
      className="rounded-xl border border-sky-500/25 bg-sky-950/15 p-5 shadow-[0_0_0_1px_rgba(14,165,233,0.06)]"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-sky-100">Visitor analytics</h2>
          <p className="mt-2 max-w-3xl text-sm text-slate-400">
            Ecosystem-wide unique visitors and page views (all hubs and routes). Per-page visitors and
            individual UI actions appear below for Master drill-down. Geo uses edge headers only
            (Vercel / Cloudflare).
          </p>
          <p className="mt-2 max-w-3xl rounded-lg border border-emerald-500/25 bg-emerald-950/20 px-3 py-2 text-xs text-emerald-100/90">
            Privacy: <strong className="font-semibold">raw IP addresses are never stored</strong>. We keep a
            SHA-256 of the anonymous visitor cookie, country code, optional city/region, and aggregate counts
            only. Rate limiting also uses hashed keys — not plaintext IPs.
          </p>
        </div>
        <button
          type="button"
          disabled={busy || loading}
          onClick={() => void load()}
          className="rounded-lg border border-white/15 px-3 py-2 text-xs font-medium text-slate-200 hover:border-white/30 disabled:opacity-50"
        >
          Refresh
        </button>
      </div>

      {loading ? <p className="mt-4 text-sm text-slate-500">Loading visitor analytics…</p> : null}
      {error ? (
        <p className="mt-4 rounded-lg border border-rose-500/40 bg-rose-950/40 px-3 py-2 text-sm text-rose-100">
          {error}
        </p>
      ) : null}
      {saved ? (
        <p className="mt-4 rounded-lg border border-emerald-500/35 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-100">
          {saved}
        </p>
      ) : null}

      {data ? (
        <>
          <label className="mt-4 flex cursor-pointer items-start gap-3 text-sm text-slate-300">
            <input
              type="checkbox"
              className="mt-1 rounded border-white/20"
              checked={data.showPublicVisitorStats}
              disabled={busy}
              onChange={(e) => void togglePublic(e.target.checked)}
            />
            <span>
              <span className="font-medium text-white">Show visitor counts on the home page</span>
              <span className="mt-0.5 block text-xs text-slate-500">
                Public strip shows whole-ecosystem today + total unique visitors and page views only
                (no countries or per-page detail).
              </span>
            </span>
          </label>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Metric label="Today visitors" value={fmt(data.today.uniqueVisitors)} hint={data.today.day} />
            <Metric label="Today page views" value={fmt(data.today.pageViews)} hint="UTC day" />
            <Metric label="Total visitors" value={fmt(data.total.uniqueVisitors)} hint="All time" />
            <Metric label="Total page views" value={fmt(data.total.pageViews)} hint="All time" />
          </div>

          <div className="mt-6">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Pages (ecosystem routes)
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Visitors and views per path. Dynamic ids are normalized (e.g. <code className="text-slate-400">:id</code>).
              Window = last 30 UTC days.
            </p>
            <div className="mt-2 max-h-80 overflow-auto rounded-lg border border-white/10">
              <table className="min-w-full text-xs">
                <thead className="sticky top-0 bg-[#0a1528] text-left text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Page</th>
                    <th className="px-3 py-2">Today visitors</th>
                    <th className="px-3 py-2">Today views</th>
                    <th className="px-3 py-2">30d visitors</th>
                    <th className="px-3 py-2">30d views</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.pages ?? []).length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-6 text-center text-slate-500">
                        No per-page data yet — new visits after this deploy will appear here.
                      </td>
                    </tr>
                  ) : (
                    (data.pages ?? []).map((r) => (
                      <tr key={r.path} className="border-t border-white/5 text-slate-200">
                        <td className="px-3 py-1.5 font-mono text-[11px]">{r.path}</td>
                        <td className="px-3 py-1.5 tabular-nums">{fmt(r.todayUnique)}</td>
                        <td className="px-3 py-1.5 tabular-nums">{fmt(r.todayViews)}</td>
                        <td className="px-3 py-1.5 tabular-nums">{fmt(r.windowUnique)}</td>
                        <td className="px-3 py-1.5 tabular-nums">{fmt(r.windowViews)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Actions by page (30 days)
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Aggregated clicks and form submits captured on each route.
              </p>
              <div className="mt-2 max-h-72 overflow-auto rounded-lg border border-white/10">
                <table className="min-w-full text-xs">
                  <thead className="sticky top-0 bg-[#0a1528] text-left text-slate-500">
                    <tr>
                      <th className="px-3 py-2">Page</th>
                      <th className="px-3 py-2">Action</th>
                      <th className="px-3 py-2">Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data.actions ?? []).length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-3 py-6 text-center text-slate-500">
                          No actions recorded yet.
                        </td>
                      </tr>
                    ) : (
                      (data.actions ?? []).map((r) => (
                        <tr
                          key={`${r.path}-${r.action}`}
                          className="border-t border-white/5 text-slate-200"
                        >
                          <td className="px-3 py-1.5 font-mono text-[11px]">{r.path}</td>
                          <td className="max-w-[14rem] truncate px-3 py-1.5" title={r.action}>
                            {r.action}
                          </td>
                          <td className="px-3 py-1.5 tabular-nums">{fmt(r.count)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Recent individual actions
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Latest anonymized events (hashed visitor only; pruned after ~14 days).
              </p>
              <div className="mt-2 max-h-72 overflow-auto rounded-lg border border-white/10">
                <table className="min-w-full text-xs">
                  <thead className="sticky top-0 bg-[#0a1528] text-left text-slate-500">
                    <tr>
                      <th className="px-3 py-2">When (UTC)</th>
                      <th className="px-3 py-2">Page</th>
                      <th className="px-3 py-2">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data.recentActions ?? []).length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-3 py-6 text-center text-slate-500">
                          No individual actions yet.
                        </td>
                      </tr>
                    ) : (
                      (data.recentActions ?? []).map((r) => (
                        <tr key={r.id} className="border-t border-white/5 text-slate-200">
                          <td className="whitespace-nowrap px-3 py-1.5 font-mono text-[10px] text-slate-400">
                            {r.createdAt.replace("T", " ").slice(0, 19)}
                          </td>
                          <td className="px-3 py-1.5 font-mono text-[11px]">{r.path}</td>
                          <td className="max-w-[12rem] truncate px-3 py-1.5" title={r.action}>
                            {r.action}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Last 30 days
              </h3>
              <div className="mt-2 max-h-64 overflow-auto rounded-lg border border-white/10">
                <table className="min-w-full text-xs">
                  <thead className="sticky top-0 bg-[#0a1528] text-left text-slate-500">
                    <tr>
                      <th className="px-3 py-2">Day</th>
                      <th className="px-3 py-2">Visitors</th>
                      <th className="px-3 py-2">Views</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.last30Days.map((r) => (
                      <tr key={r.day} className="border-t border-white/5 text-slate-200">
                        <td className="px-3 py-1.5 font-mono">{r.day}</td>
                        <td className="px-3 py-1.5 tabular-nums">{fmt(r.uniqueVisitors)}</td>
                        <td className="px-3 py-1.5 tabular-nums">{fmt(r.pageViews)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Countries today
              </h3>
              <div className="mt-2 max-h-64 overflow-auto rounded-lg border border-white/10">
                <table className="min-w-full text-xs">
                  <thead className="sticky top-0 bg-[#0a1528] text-left text-slate-500">
                    <tr>
                      <th className="px-3 py-2">Country</th>
                      <th className="px-3 py-2">Location</th>
                      <th className="px-3 py-2">Visitors</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.countriesToday.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-3 py-6 text-center text-slate-500">
                          No visits recorded today yet.
                        </td>
                      </tr>
                    ) : (
                      data.countriesToday.map((r) => (
                        <tr
                          key={`${r.countryCode}-${r.location}`}
                          className="border-t border-white/5 text-slate-200"
                        >
                          <td className="px-3 py-1.5">
                            {r.countryName}{" "}
                            <span className="font-mono text-slate-500">({r.countryCode})</span>
                          </td>
                          <td className="px-3 py-1.5 text-slate-400">{r.location || "—"}</td>
                          <td className="px-3 py-1.5 tabular-nums">{fmt(r.uniqueVisitors)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Countries (all time)
              </h3>
              <div className="mt-2 max-h-64 overflow-auto rounded-lg border border-white/10">
                <table className="min-w-full text-xs">
                  <thead className="sticky top-0 bg-[#0a1528] text-left text-slate-500">
                    <tr>
                      <th className="px-3 py-2">Country</th>
                      <th className="px-3 py-2">Visitors</th>
                      <th className="px-3 py-2">Views</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.countriesAllTime.map((r) => (
                      <tr key={r.countryCode} className="border-t border-white/5 text-slate-200">
                        <td className="px-3 py-1.5">
                          {r.countryName}{" "}
                          <span className="font-mono text-slate-500">({r.countryCode})</span>
                        </td>
                        <td className="px-3 py-1.5 tabular-nums">{fmt(r.uniqueVisitors)}</td>
                        <td className="px-3 py-1.5 tabular-nums">{fmt(r.pageViews)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Top locations (cities / regions)
              </h3>
              <div className="mt-2 max-h-64 overflow-auto rounded-lg border border-white/10">
                <table className="min-w-full text-xs">
                  <thead className="sticky top-0 bg-[#0a1528] text-left text-slate-500">
                    <tr>
                      <th className="px-3 py-2">Location</th>
                      <th className="px-3 py-2">Country</th>
                      <th className="px-3 py-2">Visitors</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.topLocations.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-3 py-6 text-center text-slate-500">
                          No city/region data from the edge yet.
                        </td>
                      </tr>
                    ) : (
                      data.topLocations.map((r) => (
                        <tr
                          key={`${r.countryCode}-${r.location}`}
                          className="border-t border-white/5 text-slate-200"
                        >
                          <td className="px-3 py-1.5">{r.location}</td>
                          <td className="px-3 py-1.5 text-slate-400">{r.countryName}</td>
                          <td className="px-3 py-1.5 tabular-nums">{fmt(r.uniqueVisitors)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </section>
  );
}

function Metric({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/20 p-3">
      <p className="text-[11px] text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-semibold text-white tabular-nums">{value}</p>
      <p className="mt-0.5 text-[10px] text-slate-600">{hint}</p>
    </div>
  );
}
