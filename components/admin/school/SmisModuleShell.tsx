"use client";

import { useCallback, useEffect, useState } from "react";
import { useSchoolAdminApi } from "@/hooks/useSchoolAdminApi";
import { clientFetchErrorMessage } from "@/lib/client-fetch-error";

/** Server-backed SMIS module shell (attendance / quran / exams / audit). */
export function SmisModuleShell({
  title,
  description,
  storageKey,
  columns,
}: {
  title: string;
  description: string;
  /** Maps to API module key, e.g. attendance */
  storageKey: string;
  columns: string[];
}) {
  const moduleName = storageKey.replace(/^odelhub-smis-/, "").replace(/^smis[-_]?/i, "") || storageKey;
  const { schoolFetch, needsOrgSlug } = useSchoolAdminApi();
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (needsOrgSlug) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await schoolFetch("/api/admin/school/smis", undefined, { module: moduleName });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(typeof j.error === "string" ? j.error : "Load failed");
      }
      const data = (await res.json()) as { entries: Record<string, string>[] };
      setRows(data.entries ?? []);
      // Migrate any legacy localStorage rows once.
      try {
        const raw = localStorage.getItem(storageKey);
        if (raw && (data.entries?.length ?? 0) === 0) {
          const legacy = JSON.parse(raw) as Record<string, string>[];
          for (const item of legacy.slice(0, 50)) {
            const { _at: _ignored, ...payload } = item;
            await schoolFetch("/api/admin/school/smis", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ module: moduleName, payload }),
            });
          }
          localStorage.removeItem(storageKey);
          const again = await schoolFetch("/api/admin/school/smis", undefined, { module: moduleName });
          if (again.ok) {
            const d2 = (await again.json()) as { entries: Record<string, string>[] };
            setRows(d2.entries ?? []);
          }
        }
      } catch {
        /* ignore migrate errors */
      }
    } catch (e) {
      setError(clientFetchErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [moduleName, needsOrgSlug, schoolFetch, storageKey]);

  useEffect(() => {
    void load();
  }, [load]);

  async function addEntry() {
    if (!columns.some((c) => (draft[c] ?? "").trim())) return;
    setError(null);
    try {
      const res = await schoolFetch("/api/admin/school/smis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ module: moduleName, payload: draft }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof j.error === "string" ? j.error : "Save failed");
      setDraft({});
      void load();
    } catch (e) {
      setError(clientFetchErrorMessage(e));
    }
  }

  async function removeEntry(id: string) {
    setError(null);
    try {
      const res = await schoolFetch("/api/admin/school/smis", { method: "DELETE" }, { id });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(typeof j.error === "string" ? j.error : "Delete failed");
      }
      void load();
    } catch (e) {
      setError(clientFetchErrorMessage(e));
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">{title}</h1>
        <p className="text-sm text-slate-400">{description}</p>
        <p className="mt-1 text-xs text-emerald-200/80">Synced to the school database (not browser-only).</p>
      </div>
      {needsOrgSlug ? <p className="text-sm text-amber-300">Master: set org slug first.</p> : null}
      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
      <div className="grid gap-2 rounded-2xl border border-white/10 bg-[#0a101f] p-4 sm:grid-cols-2">
        {columns.map((c) => (
          <label key={c} className="text-xs text-slate-400">
            {c}
            <input
              value={draft[c] ?? ""}
              onChange={(e) => setDraft((d) => ({ ...d, [c]: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white"
            />
          </label>
        ))}
        <button
          type="button"
          className="sm:col-span-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white"
          onClick={() => void addEntry()}
        >
          Add entry
        </button>
      </div>
      {loading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : (
        <ul className="space-y-2">
          {rows.length === 0 ? (
            <li className="text-sm text-slate-500">No entries yet.</li>
          ) : (
            rows.map((r) => (
              <li key={r.id} className="rounded-xl border border-white/10 px-4 py-3 text-sm text-slate-200">
                {columns.map((c) => (
                  <span key={c} className="mr-3 inline-block">
                    <span className="text-slate-500">{c}:</span> {r[c] || "—"}
                  </span>
                ))}
                <button
                  type="button"
                  className="ml-2 text-xs text-rose-300"
                  onClick={() => void removeEntry(r.id)}
                >
                  Remove
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
