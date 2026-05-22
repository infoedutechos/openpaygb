"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { readJsonResponse } from "@/utils/read-json-response";

type BackupStatus = {
  counts: Record<string, number>;
  totalRecords: number;
  checkedAt: string;
};

type RestoreReport = {
  mode: string;
  dryRun: boolean;
  exportedAt: string | null;
  backupVersion: number | null;
  counts: Record<string, number>;
  issues: { level: string; code: string; message: string }[];
  inserted: Record<string, number>;
  skipped: Record<string, number>;
  warnings: string[];
};

export function MasterBackupPanel() {
  const [status, setStatus] = useState<BackupStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [restoreBusy, setRestoreBusy] = useState(false);
  const [restoreMode, setRestoreMode] = useState<"dryRun" | "replaceTuition" | "mergeUpsert">("dryRun");
  const [restoreConfirm, setRestoreConfirm] = useState("");
  const [restoreReport, setRestoreReport] = useState<RestoreReport | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const r = await fetch("/api/master/backup/status", { credentials: "include" });
      const parsed = await readJsonResponse<BackupStatus>(r);
      if (!parsed.ok) throw new Error(parsed.error);
      setStatus(parsed.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function downloadBackup() {
    setDownloading(true);
    setError(null);
    try {
      const r = await fetch("/api/master/backup", { credentials: "include" });
      if (!r.ok) {
        const parsed = await readJsonResponse<{ error?: string }>(r);
        throw new Error(parsed.ok ? "Download failed" : parsed.error);
      }
      const blob = await r.blob();
      const dispo = r.headers.get("Content-Disposition") ?? "";
      const match = /filename="([^"]+)"/.exec(dispo);
      const filename = match?.[1] ?? `odelhub-tuition-backup-${Date.now()}.json`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Download failed");
    } finally {
      setDownloading(false);
    }
  }

  async function runRestore() {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setError("Choose a backup .json file first");
      return;
    }
    if (restoreMode !== "dryRun" && restoreConfirm !== "RESTORE") {
      setError('Type RESTORE in the confirmation box to run a destructive restore');
      return;
    }

    setRestoreBusy(true);
    setError(null);
    setRestoreReport(null);
    try {
      const fd = new FormData();
      fd.set("file", file);
      fd.set("mode", restoreMode);
      if (restoreMode !== "dryRun") fd.set("confirm", restoreConfirm);

      const r = await fetch("/api/master/backup/restore", {
        method: "POST",
        body: fd,
        credentials: "include",
      });
      const parsed = await readJsonResponse<{ report: RestoreReport; error?: string }>(r);
      if (!parsed.ok) throw new Error(parsed.error);
      setRestoreReport(parsed.data.report);
      if (!parsed.data.report.dryRun) {
        await refresh();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Restore failed");
    } finally {
      setRestoreBusy(false);
    }
  }

  return (
    <section
      id="system-backup"
      className="rounded-xl border border-violet-500/25 bg-violet-950/20 p-5 shadow-[0_0_0_1px_rgba(139,92,246,0.08)]"
    >
      <h2 className="text-sm font-semibold text-violet-100">System backup &amp; restore</h2>
      <p className="mt-2 max-w-3xl text-xs leading-relaxed text-slate-400">
        <strong className="text-slate-300">Export</strong> — point-in-time JSON (tuition scope v2): organizations,
        programmes, fees, students, payments, FX, platform settings, partner config (secrets redacted).{" "}
        <strong className="text-slate-300">Restore</strong> — dry-run validation, full replace (empty tuition
        layer first), or merge by organization slug. Primary production DR: MongoDB Atlas PITR. See{" "}
        <code className="text-slate-500">docs/BACKUP_AND_RECOVERY.md</code>.
      </p>

      {error ? <p className="mt-3 text-sm text-rose-400">{error}</p> : null}

      {loading ? (
        <p className="mt-4 text-sm text-slate-500">Loading record counts…</p>
      ) : status ? (
        <div className="mt-4 rounded-lg border border-white/10 bg-black/25 p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-violet-200/80">
            Live database ({status.totalRecords.toLocaleString()} records)
          </p>
          <p className="mt-1 text-[11px] text-slate-600">Checked {new Date(status.checkedAt).toLocaleString()}</p>
          <ul className="mt-3 grid gap-1 text-xs text-slate-400 sm:grid-cols-2">
            {Object.entries(status.counts).map(([k, n]) => (
              <li key={k} className="flex justify-between gap-2 rounded px-2 py-0.5">
                <span className="font-mono text-slate-500">{k}</span>
                <span className="tabular-nums text-slate-300">{n.toLocaleString()}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={downloading}
          onClick={() => void downloadBackup()}
          className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-50"
        >
          {downloading ? "Preparing download…" : "Download backup"}
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={() => void refresh()}
          className="rounded-lg border border-white/15 px-4 py-2 text-sm text-slate-300 hover:bg-white/5 disabled:opacity-50"
        >
          Refresh counts
        </button>
      </div>

      <div className="mt-8 border-t border-violet-500/20 pt-6">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-violet-200/90">Restore from file</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="text-[11px] text-slate-500">Backup JSON file</label>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="mt-1 block w-full text-xs text-slate-400 file:mr-3 file:rounded-md file:border-0 file:bg-violet-600 file:px-3 file:py-1.5 file:text-white"
            />
          </div>
          <div>
            <label className="text-[11px] text-slate-500">Mode</label>
            <select
              value={restoreMode}
              onChange={(e) => setRestoreMode(e.target.value as typeof restoreMode)}
              className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[#0d1526] px-3 py-2 text-sm text-white"
            >
              <option value="dryRun">Dry run (validate only)</option>
              <option value="replaceTuition">Replace tuition data (destructive)</option>
              <option value="mergeUpsert">Merge / upsert by slug &amp; id</option>
            </select>
          </div>
          <div>
            <label className="text-[11px] text-slate-500">Confirm (required for restore)</label>
            <input
              value={restoreConfirm}
              onChange={(e) => setRestoreConfirm(e.target.value)}
              placeholder="Type RESTORE"
              className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[#0d1526] px-3 py-2 text-sm text-white"
            />
          </div>
        </div>
        <button
          type="button"
          disabled={restoreBusy}
          onClick={() => void runRestore()}
          className="mt-4 rounded-lg border border-rose-500/40 bg-rose-950/40 px-4 py-2 text-sm font-medium text-rose-100 hover:bg-rose-950/60 disabled:opacity-50"
        >
          {restoreBusy ? "Running…" : restoreMode === "dryRun" ? "Validate backup" : "Run restore"}
        </button>
      </div>

      {restoreReport ? (
        <div className="mt-4 rounded-lg border border-emerald-500/25 bg-emerald-950/20 p-4 text-xs text-slate-300">
          <p className="font-medium text-emerald-200">
            {restoreReport.dryRun ? "Validation report" : "Restore completed"} — backup{" "}
            {restoreReport.exportedAt ? new Date(restoreReport.exportedAt).toLocaleString() : "unknown date"}
          </p>
          {restoreReport.warnings.length > 0 ? (
            <ul className="mt-2 list-disc space-y-1 pl-4 text-slate-400">
              {restoreReport.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          ) : null}
          {restoreReport.issues.length > 0 ? (
            <ul className="mt-2 space-y-1">
              {restoreReport.issues.map((i) => (
                <li key={`${i.code}-${i.message}`} className={i.level === "error" ? "text-rose-300" : "text-amber-200"}>
                  [{i.level}] {i.message}
                </li>
              ))}
            </ul>
          ) : null}
          {!restoreReport.dryRun ? (
            <p className="mt-2 text-slate-500">
              Inserted: {Object.entries(restoreReport.inserted).map(([k, v]) => `${k}=${v}`).join(", ")}
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
