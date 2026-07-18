"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ADMISSION_FORMAT_SETTINGS_PATH } from "@/lib/admission-format";

type AdmissionSettings = {
  admissionFormatConfigured: boolean;
  admissionPrefix: string;
  admissionIncludeYear: boolean;
  admissionYearSource: "calendar" | "academic" | "none";
  admissionSeqDigits: number;
  admissionSeparator: string;
  admissionSeqStart: number;
  admissionPreview: string;
  admissionResolvedPrefix: string;
  currentAcademicYearLabel: string;
  institutionTier: string;
};

export function AdmissionFormatSettings() {
  const [data, setData] = useState<AdmissionSettings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const r = await fetch("/api/admin/organization/settings", { credentials: "include" });
      const j = (await r.json()) as AdmissionSettings & { error?: string };
      if (!r.ok) throw new Error(j.error ?? "Failed to load settings");
      setData({
        admissionFormatConfigured: Boolean(j.admissionFormatConfigured),
        admissionPrefix: j.admissionPrefix ?? "",
        admissionIncludeYear: j.admissionIncludeYear !== false,
        admissionYearSource: j.admissionYearSource ?? "calendar",
        admissionSeqDigits: j.admissionSeqDigits ?? 4,
        admissionSeparator: j.admissionSeparator ?? "-",
        admissionSeqStart: j.admissionSeqStart ?? 1,
        admissionPreview: j.admissionPreview ?? "",
        admissionResolvedPrefix: j.admissionResolvedPrefix ?? "",
        currentAcademicYearLabel: j.currentAcademicYearLabel ?? "",
        institutionTier: j.institutionTier ?? "university",
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
          admissionFormatConfigured: true,
          admissionPrefix: data.admissionPrefix,
          admissionIncludeYear: data.admissionIncludeYear,
          admissionYearSource: data.admissionYearSource,
          admissionSeqDigits: data.admissionSeqDigits,
          admissionSeparator: data.admissionSeparator,
          admissionSeqStart: data.admissionSeqStart,
        }),
      });
      const j = (await r.json()) as AdmissionSettings & { error?: string };
      if (!r.ok) throw new Error(j.error ?? "Save failed");
      setData((prev) =>
        prev
          ? {
              ...prev,
              admissionFormatConfigured: true,
              admissionPreview: j.admissionPreview ?? prev.admissionPreview,
              admissionResolvedPrefix: j.admissionResolvedPrefix ?? prev.admissionResolvedPrefix,
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
      <section id="admission-number" className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
        <p className="text-sm text-slate-400">Loading admission number settings…</p>
      </section>
    );
  }

  return (
    <section id="admission-number" className="scroll-mt-24 rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
      <h2 className="text-lg font-semibold text-white">Admission / registration number format</h2>
      <p className="mt-1 text-sm text-slate-400">
        Customize how new student admission numbers are auto-generated. The next number is always based on students
        already registered for your school in the system (highest matching sequence, or student count when starting
        fresh).
      </p>
      {error ? <p className="mt-3 text-sm text-rose-400">{error}</p> : null}
      {data ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-xs text-slate-400">
            Prefix (leave blank to use school slug initials)
            <input
              value={data.admissionPrefix}
              onChange={(e) => setData({ ...data, admissionPrefix: e.target.value.toUpperCase() })}
              placeholder={data.admissionResolvedPrefix || "RIV"}
              maxLength={12}
              className="rounded-md border border-[var(--border)] bg-[#0d1526] px-3 py-2 font-mono text-sm text-white"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-slate-400">
            Separator
            <input
              value={data.admissionSeparator}
              onChange={(e) => setData({ ...data, admissionSeparator: e.target.value })}
              maxLength={3}
              className="rounded-md border border-[var(--border)] bg-[#0d1526] px-3 py-2 font-mono text-sm text-white"
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-300 sm:col-span-2">
            <input
              type="checkbox"
              checked={data.admissionIncludeYear}
              onChange={(e) => setData({ ...data, admissionIncludeYear: e.target.checked })}
            />
            Include year / session token
          </label>
          {data.admissionIncludeYear ? (
            <label className="flex flex-col gap-1 text-xs text-slate-400">
              Year source
              <select
                value={data.admissionYearSource}
                onChange={(e) =>
                  setData({
                    ...data,
                    admissionYearSource: e.target.value as AdmissionSettings["admissionYearSource"],
                  })
                }
                className="rounded-md border border-[var(--border)] bg-[#0d1526] px-3 py-2 text-sm text-white"
              >
                <option value="calendar">Calendar year (e.g. 2026)</option>
                <option value="academic">Academic year label (e.g. 2025 from 2025/2026)</option>
                <option value="none">None (prefix + sequence only)</option>
              </select>
            </label>
          ) : null}
          <label className="flex flex-col gap-1 text-xs text-slate-400">
            Sequence digits (3–6)
            <input
              type="number"
              min={3}
              max={6}
              value={data.admissionSeqDigits}
              onChange={(e) => setData({ ...data, admissionSeqDigits: Number(e.target.value) })}
              className="rounded-md border border-[var(--border)] bg-[#0d1526] px-3 py-2 text-sm text-white"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-slate-400">
            Start sequence from (when no matches yet)
            <input
              type="number"
              min={1}
              value={data.admissionSeqStart}
              onChange={(e) => setData({ ...data, admissionSeqStart: Number(e.target.value) })}
              className="rounded-md border border-[var(--border)] bg-[#0d1526] px-3 py-2 text-sm text-white"
            />
          </label>
          <div className="sm:col-span-2 rounded-lg border border-cyan-500/25 bg-cyan-950/20 px-4 py-3">
            <p className="text-xs text-slate-400">Preview example</p>
            <p className="mt-1 font-mono text-lg font-semibold tracking-wide text-cyan-100">
              {data.admissionPreview || "—"}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Status:{" "}
              {data.admissionFormatConfigured ? (
                <span className="text-emerald-400">Configured</span>
              ) : (
                <span className="text-amber-300">Using default — save to confirm your format</span>
              )}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void save()}
              className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-500 disabled:opacity-50"
            >
              {busy ? "Saving…" : "Save admission format"}
            </button>
            {saved ? <span className="text-sm text-emerald-400">Saved</span> : null}
            <Link href="/admin/students" className="text-sm text-cyan-300 hover:underline">
              Back to students
            </Link>
          </div>
          <p className="sm:col-span-2 text-xs text-slate-500">
            Deep link for Create student:{" "}
            <code className="text-slate-400">{ADMISSION_FORMAT_SETTINGS_PATH}</code>
            {data.institutionTier === "school" && !data.currentAcademicYearLabel.trim() && data.admissionYearSource === "academic"
              ? " — Set your academic year label above (or in session settings) when using academic year tokens."
              : null}
          </p>
        </div>
      ) : null}
    </section>
  );
}
