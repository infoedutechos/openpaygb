"use client";

import { useCallback, useEffect, useState } from "react";
import { readJsonResponse } from "@/utils/read-json-response";

type DemoSlot = {
  key: string;
  label: string;
  kind: "admin" | "student";
  role: string | null;
  orgSlug: string | null;
  orgName: string | null;
  loginPath: string;
  email: string;
  name: string;
  userId: string | null;
  exists: boolean;
  hasPassword: boolean;
};

type Draft = {
  email: string;
  name: string;
  password: string;
};

export function MasterDemoLoginsSettings() {
  const [slots, setSlots] = useState<DemoSlot[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  const applySlots = useCallback((next: DemoSlot[]) => {
    setSlots(next);
    const d: Record<string, Draft> = {};
    for (const s of next) {
      d[s.key] = { email: s.email, name: s.name, password: "" };
    }
    setDrafts(d);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch("/api/master/demo-logins", { credentials: "include" });
      const parsed = await readJsonResponse<{ slots: DemoSlot[] }>(r);
      if (!parsed.ok) throw new Error(parsed.error);
      applySlots(parsed.data.slots ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load demo logins");
    } finally {
      setLoading(false);
    }
  }, [applySlots]);

  useEffect(() => {
    void load();
  }, [load]);

  function updateDraft(key: string, patch: Partial<Draft>) {
    setDrafts((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));
  }

  async function saveAll() {
    setBusy(true);
    setError(null);
    setSaved(null);
    try {
      const body = {
        slots: slots.map((s) => {
          const d = drafts[s.key] ?? { email: s.email, name: s.name, password: "" };
          return {
            key: s.key,
            email: d.email.trim(),
            name: d.name.trim(),
            password: d.password.trim() || undefined,
            provisionIfMissing: true,
          };
        }),
      };
      const r = await fetch("/api/master/demo-logins", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const parsed = await readJsonResponse<{
        slots: DemoSlot[];
        messages?: string[];
        error?: string;
      }>(r);
      if (!parsed.ok) throw new Error(parsed.error);
      applySlots(parsed.data.slots ?? []);
      setSaved((parsed.data.messages ?? ["Demo logins saved."]).join(" · "));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function saveOne(key: string) {
    setBusy(true);
    setError(null);
    setSaved(null);
    try {
      const d = drafts[key];
      if (!d) throw new Error("Missing draft");
      const r = await fetch("/api/master/demo-logins", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          slots: [
            {
              key,
              email: d.email.trim(),
              name: d.name.trim(),
              password: d.password.trim() || undefined,
              provisionIfMissing: true,
            },
          ],
        }),
      });
      const parsed = await readJsonResponse<{
        slots: DemoSlot[];
        messages?: string[];
      }>(r);
      if (!parsed.ok) throw new Error(parsed.error);
      applySlots(parsed.data.slots ?? []);
      setSaved((parsed.data.messages ?? ["Saved."]).join(" · "));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      id="demo-logins"
      className="rounded-xl border border-emerald-500/25 bg-emerald-950/15 p-5 shadow-[0_0_0_1px_rgba(16,185,129,0.06)]"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-emerald-100">Demo logins (MAC)</h2>
          <p className="mt-2 max-w-3xl text-sm text-slate-400">
            Customise every seeded demo account — platform master, university admin/student, and Riverside
            school admin/student. Changes update live database users immediately and sync{" "}
            <code className="text-xs text-emerald-200/80">SEED_*</code> deployment-env overrides for the next{" "}
            <code className="text-xs">npm run seed</code>. Passwords are never shown; leave blank to keep the
            current password.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy || loading}
            onClick={() => void load()}
            className="rounded-lg border border-white/15 px-3 py-2 text-xs font-medium text-slate-200 hover:border-white/30 disabled:opacity-50"
          >
            Refresh
          </button>
          <button
            type="button"
            disabled={busy || loading}
            onClick={() => void saveAll()}
            className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-slate-950 hover:bg-emerald-500 disabled:opacity-50"
          >
            {busy ? "Saving…" : "Save all demos"}
          </button>
        </div>
      </div>

      {loading ? <p className="mt-4 text-sm text-slate-500">Loading demo accounts…</p> : null}
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

      <ul className="mt-5 space-y-4">
        {slots.map((s) => {
          const d = drafts[s.key] ?? { email: s.email, name: s.name, password: "" };
          return (
            <li
              key={s.key}
              className="rounded-xl border border-white/10 bg-black/20 p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-white">{s.label}</p>
                  <p className="mt-1 text-[11px] text-slate-500">
                    {s.kind}
                    {s.role ? ` · ${s.role}` : ""}
                    {s.orgSlug ? ` · org ${s.orgSlug}` : ""}
                    {s.orgName ? ` (${s.orgName})` : ""}
                    {" · "}
                    <a href={s.loginPath} className="text-cyan-300/90 underline-offset-2 hover:underline">
                      {s.loginPath}
                    </a>
                    {" · "}
                    {s.exists ? (
                      <span className="text-emerald-300/90">linked</span>
                    ) : (
                      <span className="text-amber-300/90">missing — will provision on save</span>
                    )}
                    {s.exists && s.hasPassword ? " · password set" : s.exists ? " · no password" : ""}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void saveOne(s.key)}
                  className="rounded-lg border border-emerald-500/40 bg-emerald-950/40 px-3 py-1.5 text-xs font-semibold text-emerald-100 hover:border-emerald-400/60 disabled:opacity-50"
                >
                  Save
                </button>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <label className="block text-xs text-slate-500">
                  Display name
                  <input
                    value={d.name}
                    onChange={(e) => updateDraft(s.key, { name: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
                  />
                </label>
                <label className="block text-xs text-slate-500">
                  Email / login
                  <input
                    type="email"
                    value={d.email}
                    onChange={(e) => updateDraft(s.key, { email: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
                    autoComplete="off"
                  />
                </label>
                <label className="block text-xs text-slate-500">
                  New password (optional)
                  <input
                    type="password"
                    value={d.password}
                    onChange={(e) => updateDraft(s.key, { password: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
                    placeholder="Leave blank to keep"
                    autoComplete="new-password"
                  />
                </label>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
