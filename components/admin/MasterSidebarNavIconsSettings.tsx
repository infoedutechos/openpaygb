"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { SidebarNavIcon } from "@/components/nav/sidebar-nav-icons";
import { invalidateSidebarNavIconOverridesCache } from "@/hooks/useSidebarNavIconOverrides";
import { readJsonResponse } from "@/utils/read-json-response";

type CatalogItem = { id: string; label: string };
type NavKeyRow = { navKey: string; label: string; defaultIconId: string; group: string };

export function MasterSidebarNavIconsSettings() {
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [navKeys, setNavKeys] = useState<NavKeyRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [pickerFor, setPickerFor] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const r = await fetch("/api/master/sidebar-nav-icons", { credentials: "include" });
    const parsed = await readJsonResponse<{
      overrides: Record<string, string>;
      catalog: CatalogItem[];
      navKeys: NavKeyRow[];
      warning?: string;
    }>(r);
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }
    setOverrides(parsed.data.overrides ?? {});
    setCatalog(parsed.data.catalog ?? []);
    setNavKeys(parsed.data.navKeys ?? []);
    setWarning(parsed.data.warning ?? null);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const groups = useMemo(() => {
    const q = filter.trim().toLowerCase();
    const map = new Map<string, NavKeyRow[]>();
    for (const row of navKeys) {
      if (q && !`${row.label} ${row.navKey}`.toLowerCase().includes(q)) continue;
      const list = map.get(row.group) ?? [];
      list.push(row);
      map.set(row.group, list);
    }
    return [...map.entries()];
  }, [navKeys, filter]);

  async function save() {
    setBusy(true);
    setError(null);
    setSaved(null);
    try {
      const r = await fetch("/api/master/sidebar-nav-icons", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ overrides }),
      });
      const parsed = await readJsonResponse<{ overrides: Record<string, string> }>(r);
      if (!parsed.ok) throw new Error(parsed.error);
      setOverrides(parsed.data.overrides);
      invalidateSidebarNavIconOverridesCache();
      setSaved("Sidebar icons saved — open portals update immediately.");
      setPickerFor(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  function setIcon(navKey: string, iconId: string, defaultIconId: string) {
    setOverrides((prev) => {
      const next = { ...prev };
      if (!iconId || iconId === defaultIconId) delete next[navKey];
      else next[navKey] = iconId;
      return next;
    });
  }

  const picking = pickerFor ? navKeys.find((r) => r.navKey === pickerFor) : null;

  return (
    <section
      id="sidebar-nav-icons"
      className="scroll-mt-24 space-y-4 rounded-2xl border border-amber-500/20 bg-[#120e0a] p-5"
    >
      <div>
        <h2 className="text-lg font-semibold text-amber-50">Sidebar nav icons</h2>
        <p className="mt-1 text-sm text-slate-400">
          Builtin SVG icons for school, university, student, staff, master, and developer sidebars.
          Click a row to pick an icon — collapsed rail and expanded labels both use it.
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5 rounded-xl border border-white/10 bg-black/25 p-3">
        {catalog.map((c) => (
          <span
            key={c.id}
            title={c.label}
            className="flex h-8 w-8 items-center justify-center rounded-md text-amber-100/90"
          >
            <SidebarNavIcon id={c.id} className="h-4 w-4" />
          </span>
        ))}
      </div>

      <input
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Filter nav items…"
        className="w-full max-w-md rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white"
      />

      {picking ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div>
              <p className="text-sm font-medium text-amber-50">Pick icon · {picking.label}</p>
              <p className="font-mono text-[10px] text-slate-500">{picking.navKey}</p>
            </div>
            <button
              type="button"
              onClick={() => setPickerFor(null)}
              className="text-xs text-slate-400 hover:text-white"
            >
              Close
            </button>
          </div>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8">
            {catalog.map((c) => {
              const current = overrides[picking.navKey] ?? picking.defaultIconId;
              const selected = current === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  title={c.label}
                  onClick={() => setIcon(picking.navKey, c.id, picking.defaultIconId)}
                  className={`flex flex-col items-center gap-1 rounded-lg border px-1.5 py-2 text-[10px] transition ${
                    selected
                      ? "border-amber-400/60 bg-amber-500/20 text-amber-50"
                      : "border-white/10 bg-black/30 text-slate-400 hover:border-white/25 hover:text-white"
                  }`}
                >
                  <SidebarNavIcon id={c.id} className="h-5 w-5" />
                  <span className="line-clamp-1 w-full text-center">{c.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {groups.map(([group, rows]) => (
        <div key={group} className="space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-400/80">{group}</p>
          <div className="space-y-2">
            {rows.map((row) => {
              const current = overrides[row.navKey] ?? row.defaultIconId;
              const isCustom = Boolean(overrides[row.navKey]);
              return (
                <button
                  key={row.navKey}
                  type="button"
                  onClick={() => setPickerFor(row.navKey === pickerFor ? null : row.navKey)}
                  className={`flex w-full flex-wrap items-center gap-3 rounded-xl border px-3 py-2 text-left transition ${
                    pickerFor === row.navKey
                      ? "border-amber-400/50 bg-amber-500/10"
                      : "border-white/10 bg-black/20 hover:border-white/20"
                  }`}
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/15 text-amber-100">
                    <SidebarNavIcon id={current} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-white">{row.label}</p>
                    <p className="font-mono text-[10px] text-slate-500">{row.navKey}</p>
                  </div>
                  <span className="text-[10px] text-slate-500">
                    {isCustom ? "custom" : "default"} · tap to change
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {warning ? <p className="text-sm text-amber-200">{warning}</p> : null}
      {error ? <p className="text-sm text-rose-400">{error}</p> : null}
      {saved ? <p className="text-sm text-emerald-300">{saved}</p> : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void save()}
          className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-500 disabled:opacity-50"
        >
          {busy ? "Saving…" : "Save sidebar icons"}
        </button>
        <button
          type="button"
          disabled={busy || Object.keys(overrides).length === 0}
          onClick={() => setOverrides({})}
          className="rounded-lg border border-white/15 px-4 py-2 text-sm text-slate-300 hover:bg-white/5 disabled:opacity-40"
        >
          Reset all to defaults
        </button>
      </div>
    </section>
  );
}
