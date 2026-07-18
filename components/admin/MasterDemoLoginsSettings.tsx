"use client";

import { useCallback, useEffect, useState } from "react";
import { readJsonResponse } from "@/utils/read-json-response";

type DemoSlot = {
  key: string;
  label: string;
  kind: "admin" | "student";
  role: string | null;
  audience: string;
  orgSlug: string | null;
  orgName: string | null;
  loginPath: string;
  email: string;
  name: string;
  userId: string | null;
  exists: boolean;
  hasPassword: boolean;
  publishPublic: boolean;
  publicPasswordHint: string;
  notes: string;
};

type Draft = {
  email: string;
  name: string;
  password: string;
  label: string;
  orgSlug: string;
  loginPath: string;
  publishPublic: boolean;
  publicPasswordHint: string;
  notes: string;
  publishPasswordAsHint: boolean;
};

function draftFromSlot(s: DemoSlot): Draft {
  return {
    email: s.email,
    name: s.name,
    password: "",
    label: s.label,
    orgSlug: s.orgSlug ?? "",
    loginPath: s.loginPath,
    publishPublic: s.publishPublic,
    publicPasswordHint: s.publicPasswordHint,
    notes: s.notes,
    publishPasswordAsHint: false,
  };
}

function downloadBlob(body: string, filename: string, contentType: string) {
  const blob = new Blob([body], { type: contentType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

type DemoPolicy = {
  lockSelfService: boolean;
  syncChangesToMac: boolean;
};

export function MasterDemoLoginsSettings() {
  const [slots, setSlots] = useState<DemoSlot[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [policy, setPolicy] = useState<DemoPolicy>({
    lockSelfService: true,
    syncChangesToMac: true,
  });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  const applySlots = useCallback((next: DemoSlot[]) => {
    setSlots(next);
    const d: Record<string, Draft> = {};
    for (const s of next) {
      d[s.key] = draftFromSlot(s);
    }
    setDrafts(d);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch("/api/master/demo-logins", { credentials: "include" });
      const parsed = await readJsonResponse<{ slots: DemoSlot[]; policy?: DemoPolicy }>(r);
      if (!parsed.ok) throw new Error(parsed.error);
      applySlots(parsed.data.slots ?? []);
      if (parsed.data.policy) setPolicy(parsed.data.policy);
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

  function patchBodyFromDraft(key: string) {
    const d = drafts[key];
    if (!d) throw new Error("Missing draft");
    return {
      key,
      email: d.email.trim(),
      name: d.name.trim(),
      password: d.password.trim() || undefined,
      label: d.label.trim(),
      orgSlug: d.orgSlug.trim() || null,
      loginPath: d.loginPath.trim(),
      publishPublic: d.publishPublic,
      publicPasswordHint: d.publicPasswordHint,
      notes: d.notes,
      publishPasswordAsHint: d.publishPasswordAsHint,
      provisionIfMissing: true,
    };
  }

  async function savePolicy(next: DemoPolicy) {
    setBusy(true);
    setError(null);
    setSaved(null);
    try {
      const r = await fetch("/api/master/demo-logins", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ policy: next }),
      });
      const parsed = await readJsonResponse<{
        policy?: DemoPolicy;
        messages?: string[];
        error?: string;
      }>(r);
      if (!parsed.ok) throw new Error(parsed.error);
      if (parsed.data.policy) setPolicy(parsed.data.policy);
      else setPolicy(next);
      setSaved((parsed.data.messages ?? ["Demo password policy saved."]).join(" · "));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save policy");
    } finally {
      setBusy(false);
    }
  }

  async function saveAll() {
    setBusy(true);
    setError(null);
    setSaved(null);
    try {
      const body = { slots: slots.map((s) => patchBodyFromDraft(s.key)) };
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
      setSaved(
        [
          ...(parsed.data.messages ?? ["Demo logins saved."]),
          "Public lobbies (/OdelPaySchools, /OdelPayUniversities) auto-update for published slots.",
        ].join(" · "),
      );
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
      const r = await fetch("/api/master/demo-logins", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ slots: [patchBodyFromDraft(key)] }),
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

  async function download(format: "json" | "csv" | "md") {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch(`/api/master/demo-logins/export?format=${format}`, {
        credentials: "include",
      });
      if (!r.ok) {
        const parsed = await readJsonResponse<{ error?: string }>(r);
        throw new Error(parsed.ok ? parsed.data.error || r.statusText : parsed.error);
      }
      const body = await r.text();
      const cd = r.headers.get("Content-Disposition") || "";
      const match = /filename="([^"]+)"/.exec(cd);
      const filename = match?.[1] ?? `odelhub-demo-logins.${format}`;
      const contentType = r.headers.get("Content-Type") || "application/octet-stream";
      downloadBlob(body, filename, contentType);
      setSaved(`Downloaded ${filename}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Download failed");
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
            Fully customise every seeded demo account — label, email, name, org slug, login path, public
            password hint, and notes. Published school/university slots auto-update on{" "}
            <code className="text-xs text-emerald-200/80">/OdelPaySchools</code> and{" "}
            <code className="text-xs text-emerald-200/80">/OdelPayUniversities</code>. Changes also sync{" "}
            <code className="text-xs text-emerald-200/80">SEED_*</code> deployment-env overrides. Download a
            credentials sheet anytime (JSON / CSV / Markdown), or from the organised catalogue under{" "}
            <a href="/admin/master#project-download" className="text-cyan-300 hover:underline">
              Docs &amp; downloads
            </a>{" "}
            (Access &amp; credentials).
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
            onClick={() => void download("json")}
            className="rounded-lg border border-cyan-500/40 bg-cyan-950/30 px-3 py-2 text-xs font-medium text-cyan-100 hover:border-cyan-400/60 disabled:opacity-50"
          >
            Download JSON
          </button>
          <button
            type="button"
            disabled={busy || loading}
            onClick={() => void download("csv")}
            className="rounded-lg border border-cyan-500/40 bg-cyan-950/30 px-3 py-2 text-xs font-medium text-cyan-100 hover:border-cyan-400/60 disabled:opacity-50"
          >
            Download CSV
          </button>
          <button
            type="button"
            disabled={busy || loading}
            onClick={() => void download("md")}
            className="rounded-lg border border-cyan-500/40 bg-cyan-950/30 px-3 py-2 text-xs font-medium text-cyan-100 hover:border-cyan-400/60 disabled:opacity-50"
          >
            Download Markdown
          </button>
          <button
            type="button"
            disabled={busy || loading}
            onClick={() => void saveAll()}
            className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-slate-950 hover:bg-emerald-500 disabled:opacity-50"
          >
            {busy ? "Working…" : "Save all demos"}
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

      <div className="mt-5 rounded-xl border border-amber-500/30 bg-amber-950/20 p-4">
        <h3 className="text-sm font-semibold text-amber-100">Community test password policy</h3>
        <p className="mt-1 text-xs text-slate-400">
          Use these when sharing demo credentials with communities. Defaults are both on.
        </p>
        <div className="mt-3 space-y-3 text-sm text-slate-300">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              className="mt-1 rounded border-white/20"
              checked={policy.lockSelfService}
              disabled={busy || loading}
              onChange={(e) => {
                const next = { ...policy, lockSelfService: e.target.checked };
                setPolicy(next);
                void savePolicy(next);
              }}
            />
            <span>
              <span className="font-medium text-white">Lock demo passwords</span>
              <span className="mt-0.5 block text-xs text-slate-500">
                Demo accounts cannot change or reset passwords themselves — only MAC Demo logins can.
              </span>
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              className="mt-1 rounded border-white/20"
              checked={policy.syncChangesToMac}
              disabled={busy || loading}
              onChange={(e) => {
                const next = { ...policy, syncChangesToMac: e.target.checked };
                setPolicy(next);
                void savePolicy(next);
              }}
            />
            <span>
              <span className="font-medium text-white">Sync password changes back to MAC</span>
              <span className="mt-0.5 block text-xs text-slate-500">
                If a demo password does change (lock off), update the public password hint and SEED_*
                overrides automatically so lobbies stay accurate.
              </span>
            </span>
          </label>
        </div>
      </div>

      <ul className="mt-5 space-y-4">
        {slots.map((s) => {
          const d =
            drafts[s.key] ??
            draftFromSlot(s);
          return (
            <li key={s.key} className="rounded-xl border border-white/10 bg-black/20 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-white">{d.label || s.label}</p>
                  <p className="mt-1 text-[11px] text-slate-500">
                    {s.key} · {s.audience} · {s.kind}
                    {s.role ? ` · ${s.role}` : ""}
                    {s.orgName ? ` · ${s.orgName}` : ""}
                    {" · "}
                    {s.exists ? (
                      <span className="text-emerald-300/90">linked</span>
                    ) : (
                      <span className="text-amber-300/90">missing — will provision on save</span>
                    )}
                    {s.exists && s.hasPassword ? " · password set" : s.exists ? " · no password" : ""}
                    {d.publishPublic ? " · published" : " · hidden from lobbies"}
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
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <label className="block text-xs text-slate-500">
                  Public label
                  <input
                    value={d.label}
                    onChange={(e) => updateDraft(s.key, { label: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
                  />
                </label>
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
                  Org slug
                  <input
                    value={d.orgSlug}
                    onChange={(e) => updateDraft(s.key, { orgSlug: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
                    placeholder="default / riverside-demo"
                    disabled={s.key === "master"}
                  />
                </label>
                <label className="block text-xs text-slate-500">
                  Login path
                  <input
                    value={d.loginPath}
                    onChange={(e) => updateDraft(s.key, { loginPath: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
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
                <label className="block text-xs text-slate-500 sm:col-span-2">
                  Public password hint (shown on lobbies when published)
                  <input
                    value={d.publicPasswordHint}
                    onChange={(e) => updateDraft(s.key, { publicPasswordHint: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
                    placeholder="Optional — leave empty to hide password on public pages"
                    autoComplete="off"
                  />
                </label>
                <label className="block text-xs text-slate-500 sm:col-span-2 lg:col-span-3">
                  Notes
                  <input
                    value={d.notes}
                    onChange={(e) => updateDraft(s.key, { notes: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
                    placeholder="Optional note for download sheet / lobbies"
                  />
                </label>
              </div>
              <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-400">
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={d.publishPublic}
                    onChange={(e) => updateDraft(s.key, { publishPublic: e.target.checked })}
                    className="rounded border-white/20"
                  />
                  Publish on public lobbies / login hints
                </label>
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={d.publishPasswordAsHint}
                    onChange={(e) => updateDraft(s.key, { publishPasswordAsHint: e.target.checked })}
                    className="rounded border-white/20"
                    disabled={!d.password.trim()}
                  />
                  Also publish new password as public hint
                </label>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
