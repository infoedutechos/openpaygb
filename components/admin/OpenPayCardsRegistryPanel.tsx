"use client";

import { useCallback, useEffect, useState } from "react";
import { OPEN_PAY_BRAND } from "@/lib/open-pay-brand";
import { fetchJson } from "@/utils/fetch-json";
import { readJsonResponse } from "@/utils/read-json-response";

type CardStats = {
  totalCards: number;
  activeCards: number;
  pendingIssue: number;
  totalBalanceUgx: number;
  totalTopups: number;
  confirmedTopups: number;
  totalTopupTon: number;
  totalTopupUgx: number;
  totalIssueFeeTon: number;
};

type CardRow = {
  id: string;
  studentName: string;
  studentEmail: string;
  programmeCode: string;
  organizationName: string;
  status: string;
  balanceUgx: number;
  maskedPan: string;
  topupCount: number;
};

type Payload = {
  stats: CardStats;
  page: number;
  pageSize: number;
  total: number;
  cards: CardRow[];
};

type Props = {
  apiPath: string;
  sectionId?: string;
  title?: string;
  description?: string;
  showSchoolColumn?: boolean;
};

export function OpenPayCardsRegistryPanel({
  apiPath,
  sectionId = "openpay-cards-overview",
  title = `${OPEN_PAY_BRAND} card registry`,
  description = "Student virtual cards, UGX balances, and top-up activity.",
  showSchoolColumn = true,
}: Props) {
  const [data, setData] = useState<Payload | null>(null);
  const [status, setStatus] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const q = new URLSearchParams({ page: "1", pageSize: "50" });
      if (status !== "all") q.set("status", status);
      const r = await fetchJson(`${apiPath}?${q}`, { credentials: "include" });
      const parsed = await readJsonResponse<Payload>(r);
      if (!parsed.ok) throw new Error(parsed.error);
      setData(parsed.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load virtual cards");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [apiPath, status]);

  useEffect(() => {
    void load();
  }, [load]);

  const stats = data?.stats;
  const colSpan = showSchoolColumn ? 6 : 5;

  return (
    <section
      id={sectionId}
      className="rounded-xl border border-violet-500/25 bg-[var(--card)] p-5 space-y-5"
    >
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-violet-400/90">Virtual cards</p>
        <h2 className="mt-2 text-lg font-semibold text-white">{title}</h2>
        <p className="mt-2 max-w-3xl text-sm text-slate-400">{description}</p>
      </div>

      {error ? <p className="text-sm text-rose-400">{error}</p> : null}

      {stats ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Total cards" value={String(stats.totalCards)} />
          <Stat label="Active" value={String(stats.activeCards)} accent="emerald" />
          <Stat label="Pending issue" value={String(stats.pendingIssue)} accent="amber" />
          <Stat label="Total UGX balance" value={`UGX ${stats.totalBalanceUgx.toLocaleString()}`} />
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        {(["all", "active", "pending_issue"] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatus(s)}
            className={`rounded-full px-3 py-1 text-xs font-semibold border ${
              status === s
                ? "border-violet-400/50 bg-violet-500/20 text-violet-100"
                : "border-white/10 text-slate-400 hover:text-slate-200"
            }`}
          >
            {s === "all" ? "All statuses" : s.replace("_", " ")}
          </button>
        ))}
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="rounded-lg border border-slate-600 px-3 py-1 text-xs text-slate-300 hover:bg-slate-800/50 disabled:opacity-50"
        >
          Refresh
        </button>
      </div>

      <div className="space-y-3 lg:hidden">
        {loading && !data ? (
          <p className="py-4 text-sm text-slate-500">Loading cards…</p>
        ) : !data?.cards.length ? (
          <p className="py-4 text-sm text-slate-500">No virtual cards yet.</p>
        ) : (
          data.cards.map((c) => (
            <article
              key={c.id}
              className="rounded-lg border border-[var(--border)] bg-black/20 p-4 text-sm text-slate-300"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-white">{c.studentName}</p>
                  <p className="text-xs text-slate-500">{c.studentEmail}</p>
                </div>
                <StatusBadge status={c.status} />
              </div>
              {showSchoolColumn ? <p className="mt-2 text-xs text-slate-500">{c.organizationName}</p> : null}
              <p className="mt-1 font-mono text-xs text-violet-200/90">{c.maskedPan || "—"}</p>
              <p className="mt-1 font-mono text-[10px] text-slate-600">{c.programmeCode}</p>
              <div className="mt-3 flex flex-wrap gap-4 text-xs tabular-nums">
                <span>
                  <span className="text-slate-600">Balance:</span> UGX {c.balanceUgx.toLocaleString()}
                </span>
                <span>
                  <span className="text-slate-600">Top-ups:</span> {c.topupCount}
                </span>
              </div>
            </article>
          ))
        )}
      </div>

      <div className="hidden overflow-x-auto rounded-lg border border-[var(--border)] lg:block">
        <table className="min-w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-900/60 text-slate-500 uppercase tracking-wide">
            <tr>
              <th className="px-3 py-2">Student</th>
              {showSchoolColumn ? <th className="px-3 py-2">School</th> : null}
              <th className="px-3 py-2">Card</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Balance</th>
              <th className="px-3 py-2">Top-ups</th>
            </tr>
          </thead>
          <tbody>
            {loading && !data ? (
              <tr>
                <td colSpan={colSpan} className="px-3 py-4 text-slate-500">
                  Loading cards…
                </td>
              </tr>
            ) : !data?.cards.length ? (
              <tr>
                <td colSpan={colSpan} className="px-3 py-4 text-slate-500">
                  No virtual cards yet.
                </td>
              </tr>
            ) : (
              data.cards.map((c) => (
                <tr key={c.id} className="border-t border-[var(--border)] hover:bg-slate-900/30">
                  <td className="px-3 py-2">
                    <p className="font-medium text-white">{c.studentName}</p>
                    <p className="text-slate-500">{c.studentEmail}</p>
                    <p className="text-slate-600 font-mono">{c.programmeCode}</p>
                  </td>
                  {showSchoolColumn ? <td className="px-3 py-2">{c.organizationName}</td> : null}
                  <td className="px-3 py-2 font-mono text-violet-200/90">{c.maskedPan || "—"}</td>
                  <td className="px-3 py-2">
                    <StatusBadge status={c.status} />
                  </td>
                  <td className="px-3 py-2 tabular-nums">UGX {c.balanceUgx.toLocaleString()}</td>
                  <td className="px-3 py-2 tabular-nums">{c.topupCount}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: "emerald" | "amber";
}) {
  const border =
    accent === "emerald"
      ? "border-emerald-500/25"
      : accent === "amber"
        ? "border-amber-500/25"
        : "border-[var(--border)]";
  return (
    <div className={`rounded-lg border bg-slate-950/30 p-3 ${border}`}>
      <p className="text-[10px] uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums text-white">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === "active"
      ? "bg-emerald-500/15 text-emerald-300"
      : status === "pending_issue"
        ? "bg-amber-500/15 text-amber-200"
        : "bg-slate-500/15 text-slate-400";
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${cls}`}>
      {status.replace("_", " ")}
    </span>
  );
}
