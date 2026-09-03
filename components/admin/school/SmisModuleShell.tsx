"use client";

import { useEffect, useState } from "react";

/** Lightweight SMIS module shell — entries stored per-browser until server models ship. */
export function SmisModuleShell({
  title,
  description,
  storageKey,
  columns,
}: {
  title: string;
  description: string;
  storageKey: string;
  columns: string[];
}) {
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [draft, setDraft] = useState<Record<string, string>>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) setRows(JSON.parse(raw) as Record<string, string>[]);
    } catch {
      /* ignore */
    }
  }, [storageKey]);

  function save(next: Record<string, string>[]) {
    setRows(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">{title}</h1>
        <p className="text-sm text-slate-400">{description}</p>
        <p className="mt-1 text-xs text-amber-200/80">
          Pilot module — entries stored in this browser. Server-backed sync is next.
        </p>
      </div>
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
          onClick={() => {
            if (!columns.some((c) => (draft[c] ?? "").trim())) return;
            save([{ ...draft, _at: new Date().toISOString() }, ...rows]);
            setDraft({});
          }}
        >
          Add entry
        </button>
      </div>
      <ul className="space-y-2">
        {rows.length === 0 ? (
          <li className="text-sm text-slate-500">No entries yet.</li>
        ) : (
          rows.map((r, i) => (
            <li key={i} className="rounded-xl border border-white/10 px-4 py-3 text-sm text-slate-200">
              {columns.map((c) => (
                <span key={c} className="mr-3 inline-block">
                  <span className="text-slate-500">{c}:</span> {r[c] || "—"}
                </span>
              ))}
              <button
                type="button"
                className="ml-2 text-xs text-rose-300"
                onClick={() => save(rows.filter((_, j) => j !== i))}
              >
                Remove
              </button>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
