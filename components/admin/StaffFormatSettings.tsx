"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { STAFF_FORMAT_SETTINGS_PATH } from "@/lib/staff-format";

type StaffSettings = {
  staffFormatConfigured: boolean;
  staffPrefix: string;
  staffIncludeYear: boolean;
  staffYearSource: "calendar" | "academic" | "none";
  staffSeqDigits: number;
  staffSeparator: string;
  staffSeqStart: number;
  staffPreview: string;
  staffResolvedPrefix: string;
  currentAcademicYearLabel: string;
};

export function StaffFormatSettings() {
  const [data, setData] = useState<StaffSettings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const r = await fetch("/api/admin/organization/settings", { credentials: "include" });
      const j = (await r.json()) as StaffSettings & { error?: string };
      if (!r.ok) throw new Error(j.error ?? "Failed to load settings");
      setData({
        staffFormatConfigured: Boolean(j.staffFormatConfigured),
        staffPrefix: j.staffPrefix ?? "",
        staffIncludeYear: j.staffIncludeYear !== false,
        staffYearSource: j.staffYearSource ?? "calendar",
        staffSeqDigits: j.staffSeqDigits ?? 4,
        staffSeparator: j.staffSeparator ?? "-",
        staffSeqStart: j.staffSeqStart ?? 1,
        staffPreview: j.staffPreview ?? "",
        staffResolvedPrefix: j.staffResolvedPrefix ?? "",
        currentAcademicYearLabel: j.currentAcademicYearLabel ?? "",
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    if (!data) return;
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const r = await fetch("/api/admin/organization/settings", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staffFormatConfigured: true,
          staffPrefix: data.staffPrefix,
          staffIncludeYear: data.staffIncludeYear,
          staffYearSource: data.staffYearSource,
          staffSeqDigits: data.staffSeqDigits,
          staffSeparator: data.staffSeparator,
          staffSeqStart: data.staffSeqStart,
        }),
      });
      const j = (await r.json()) as StaffSettings & { error?: string };
      if (!r.ok) throw new Error(j.error ?? "Save failed");
      setData((prev) =>
        prev
          ? {
              ...prev,
              staffFormatConfigured: true,
              staffPreview: j.staffPreview ?? prev.staffPreview,
              staffResolvedPrefix: j.staffResolvedPrefix ?? prev.staffResolvedPrefix,
            }
          : prev,
      );
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  if (!data && !error) {
    return (
      <section id="staff-id" className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
        <p className="text-sm text-slate-400">Loading Staff ID settings…</p>
      </section>
    );
  }

  return (
    <section id="staff-id" className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
      <h2 className="text-lg font-semibold text-white">Staff ID format</h2>
      <p className="mt-1 text-sm text-slate-400">
        Auto-generate Staff IDs for employees (like admission numbers). Staff sign in at{" "}
        <Link href="/staff/login" className="text-cyan-400 hover:underline">
          /staff/login
        </Link>{" "}
        with Staff ID + portal password.
      </p>
      {error ? <p className="mt-2 text-sm text-rose-400">{error}</p> : null}
      {data ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-xs text-slate-500">
            Prefix
            <input
              value={data.staffPrefix}
              onChange={(e) => setData({ ...data, staffPrefix: e.target.value.toUpperCase() })}
              placeholder="STF (or blank = from slug)"
              className="mt-1 w-full rounded-md border border-[var(--border)] bg-[#0d1526] px-3 py-2 text-sm text-white"
            />
          </label>
          <label className="text-xs text-slate-500">
            Separator
            <input
              value={data.staffSeparator}
              onChange={(e) => setData({ ...data, staffSeparator: e.target.value })}
              className="mt-1 w-full rounded-md border border-[var(--border)] bg-[#0d1526] px-3 py-2 text-sm text-white"
            />
          </label>
          <label className="flex items-center gap-2 text-xs text-slate-400 sm:col-span-2">
            <input
              type="checkbox"
              checked={data.staffIncludeYear}
              onChange={(e) => setData({ ...data, staffIncludeYear: e.target.checked })}
            />
            Include year token
          </label>
          <label className="text-xs text-slate-500">
            Year source
            <select
              value={data.staffYearSource}
              onChange={(e) =>
                setData({
                  ...data,
                  staffYearSource: e.target.value as StaffSettings["staffYearSource"],
                })
              }
              className="mt-1 w-full rounded-md border border-[var(--border)] bg-[#0d1526] px-3 py-2 text-sm text-white"
            >
              <option value="calendar">Calendar year</option>
              <option value="academic">Academic year label</option>
              <option value="none">None</option>
            </select>
          </label>
          <label className="text-xs text-slate-500">
            Sequence digits
            <input
              type="number"
              min={3}
              max={6}
              value={data.staffSeqDigits}
              onChange={(e) => setData({ ...data, staffSeqDigits: Number(e.target.value) })}
              className="mt-1 w-full rounded-md border border-[var(--border)] bg-[#0d1526] px-3 py-2 text-sm text-white"
            />
          </label>
          <label className="text-xs text-slate-500">
            Sequence start
            <input
              type="number"
              min={1}
              value={data.staffSeqStart}
              onChange={(e) => setData({ ...data, staffSeqStart: Number(e.target.value) })}
              className="mt-1 w-full rounded-md border border-[var(--border)] bg-[#0d1526] px-3 py-2 text-sm text-white"
            />
          </label>
          <p className="sm:col-span-2 text-sm text-cyan-200/90">
            Preview: <span className="font-mono font-semibold">{data.staffPreview || "—"}</span>
            {data.staffResolvedPrefix ? (
              <span className="ml-2 text-xs text-slate-500">(prefix {data.staffResolvedPrefix})</span>
            ) : null}
          </p>
          <div className="sm:col-span-2 flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={busy}
              onClick={() => void save()}
              className="rounded-lg bg-cyan-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {busy ? "Saving…" : "Save Staff ID format"}
            </button>
            {saved ? <span className="text-xs text-emerald-400">Saved</span> : null}
            {!data.staffFormatConfigured ? (
              <span className="text-xs text-amber-300/90">Not configured yet — defaults still allocate IDs.</span>
            ) : null}
            <Link href={STAFF_FORMAT_SETTINGS_PATH} className="text-xs text-slate-500 hover:underline">
              Deep link
            </Link>
          </div>
        </div>
      ) : null}
    </section>
  );
}
