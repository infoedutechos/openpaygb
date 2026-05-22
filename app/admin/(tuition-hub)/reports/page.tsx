"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTuitionAdminGate } from "@/hooks/useTuitionAdminGate";

type Summary = {
  totalCollectionsTon: number;
  totalCollectionsUgx?: number;
  collectionsByRail?: { rail: string; count: number; totalUgx: number; tonAmount: number }[];
  monthlyTon: { m: string; ton: number }[];
};

const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

function shortMonthLabel(monthKey: string): string {
  const mo = parseInt(monthKey.split("-")[1] ?? "", 10);
  if (mo >= 1 && mo <= 12) return MONTH_SHORT[mo - 1];
  return monthKey;
}

function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path d="M10 2a.75.75 0 01.75.75v7.59l2.22-2.22a.75.75 0 111.06 1.06l-3.5 3.5a.75.75 0 01-1.06 0l-3.5-3.5a.75.75 0 111.06-1.06l2.22 2.22V2.75A.75.75 0 0110 2z" />
      <path d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z" />
    </svg>
  );
}

function CollectionsBarChart({ rows }: { rows: { m: string; ton: number }[] }) {
  if (rows.length === 0) {
    return <p className="mt-6 text-sm text-slate-500">No collections for this period.</p>;
  }

  const w = 560;
  const h = 220;
  const padL = 44;
  const padR = 16;
  const padT = 12;
  const padB = 32;
  const chartW = w - padL - padR;
  const chartH = h - padT - padB;

  const maxVal = Math.max(...rows.map((r) => r.ton), 1);
  const yMax = Math.max(100, Math.ceil(maxVal / 100) * 100);
  const yTicks = 5;
  const step = yMax / yTicks;

  const barGap = 12;
  const barW = (chartW - barGap * (rows.length - 1)) / rows.length;

  return (
    <div className="mt-6">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" preserveAspectRatio="xMidYMid meet">
        {Array.from({ length: yTicks + 1 }, (_, i) => {
          const val = yMax - i * step;
          const y = padT + (i / yTicks) * chartH;
          return (
            <g key={val}>
              <line x1={padL} y1={y} x2={w - padR} y2={y} stroke="#e2e8f0" strokeWidth="1" />
              <text x={padL - 8} y={y + 4} textAnchor="end" className="fill-slate-400 text-[10px]">
                {Math.round(val)}
              </text>
            </g>
          );
        })}
        {rows.map((row, i) => {
          const barH = (row.ton / yMax) * chartH;
          const x = padL + i * (barW + barGap);
          const y = padT + chartH - barH;
          return (
            <g key={row.m}>
              <g>
                <title>{`${shortMonthLabel(row.m)}: ${row.ton.toFixed(2)} TON`}</title>
                <rect
                  x={x}
                  y={y}
                  width={barW}
                  height={Math.max(barH, 2)}
                  rx={3}
                  fill="rgb(59 130 246)"
                />
              </g>
              <text
                x={x + barW / 2}
                y={h - 10}
                textAnchor="middle"
                className="fill-slate-500 text-[11px]"
              >
                {shortMonthLabel(row.m)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export default function AdminReportsPage() {
  const router = useRouter();
  const { loading: authLoading, ensureTuitionSession } = useTuitionAdminGate();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [range, setRange] = useState<"year" | "all">("year");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      if (authLoading) return;
      setLoading(true);
      setError(null);
      const gate = ensureTuitionSession({
        message: "Sign in with your tuition hub admin account to view reports.",
      });
      if (!gate.ok) {
        if (gate.error) setError(gate.error);
        if (!gate.redirecting) setSummary(null);
        setLoading(false);
        return;
      }
      const r = await fetch("/api/admin/summary", { credentials: "include" });
      const j = await r.json();
      if (!r.ok) {
        setError(j.error ?? "Could not load reports");
        setLoading(false);
        return;
      }
      setSummary(j);
      setLoading(false);
    })();
  }, [authLoading, ensureTuitionSession]);

  const year = new Date().getFullYear();

  const filtered = useMemo(() => {
    const rows = summary?.monthlyTon ?? [];
    if (range === "year") return rows.filter((row) => row.m.startsWith(String(year)));
    return rows;
  }, [summary, range, year]);

  const totalForRange = useMemo(() => {
    if (range === "year") {
      const sum = filtered.reduce((acc, r) => acc + r.ton, 0);
      return Math.round(sum * 10_000) / 10_000;
    }
    return summary?.totalCollectionsTon ?? 0;
  }, [filtered, range, summary]);

  async function exportCsv() {
    const r = await fetch("/api/payments/export", { credentials: "include" });
    if (r.status === 401) {
      router.replace("/admin/login");
      return;
    }
    if (!r.ok) return;
    const blob = await r.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `odelhub-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold text-white">Reports</h1>

      {error ? <p className="text-sm text-rose-600">{error}</p> : null}

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-6">
          <div>
            <p className="text-sm font-medium text-slate-500">Total Collections</p>
            <p className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">
              {loading ? "—" : `${totalForRange.toLocaleString()} TON`}
            </p>
            {!loading && summary?.totalCollectionsUgx != null ? (
              <p className="mt-1 text-sm text-slate-500">
                UGX {summary.totalCollectionsUgx.toLocaleString()} confirmed (all time)
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={range}
              onChange={(e) => setRange(e.target.value as "year" | "all")}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm"
              aria-label="Report timeframe"
            >
              <option value="year">This Year</option>
              <option value="all">All time</option>
            </select>
            <button
              type="button"
              onClick={() => void exportCsv()}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
            >
              <DownloadIcon className="h-4 w-4 text-slate-500" />
              Export
            </button>
          </div>
        </div>

        {!loading && summary?.collectionsByRail && summary.collectionsByRail.length > 0 ? (
          <div className="mt-6">
            <h2 className="text-base font-semibold text-slate-900">By payment rail</h2>
            <ul className="mt-2 divide-y divide-slate-100 text-sm">
              {summary.collectionsByRail.map((r) => (
                <li key={r.rail} className="flex flex-col gap-1 py-2 sm:flex-row sm:justify-between sm:gap-4">
                  <span className="font-medium capitalize text-slate-800">{r.rail.replace(/_/g, " ")}</span>
                  <span className="text-slate-600 sm:text-right">
                    {r.count} payments · UGX {r.totalUgx.toLocaleString()} · {r.tonAmount} TON
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <h2 className="mt-6 text-base font-semibold text-slate-900">Collections (TON)</h2>
        {loading ? (
          <p className="mt-4 text-sm text-slate-500">Loading chart…</p>
        ) : (
          <CollectionsBarChart rows={filtered} />
        )}
      </section>
    </div>
  );
}
