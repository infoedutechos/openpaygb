"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { PasswordRevealInput } from "@/components/PasswordRevealInput";
import { fetchJson } from "@/utils/fetch-json";
import { readJsonResponse } from "@/utils/read-json-response";

type RailId = "livepay" | "relworx" | "vixonpay" | "mbiyo" | "momo";

type RailStatus = {
  id: RailId;
  title: string;
  configured: boolean;
  vars: { name: string; label: string; sensitive: boolean; set: boolean; maskedPreview: string | null }[];
};

const RAIL_ORDER: RailId[] = ["livepay", "relworx", "vixonpay", "mbiyo", "momo"];

function isRailConfigured(id: RailId, vars: RailStatus["vars"]): boolean {
  const set = (name: string) => Boolean(vars.find((v) => v.name === name)?.set);
  switch (id) {
    case "livepay":
      return set("LIVEPAY_API_KEY") && set("LIVEPAY_ACCOUNT_NUMBER");
    case "relworx":
      return set("RELWORX_API_KEY") && set("RELWORX_ACCOUNT_NO");
    case "vixonpay":
      return set("VIXONPAY_API_KEY");
    case "mbiyo":
      return set("MBIYO_SECRET_KEY");
    case "momo":
      return set("MOMO_WEBHOOK_SECRET") || set("MOMO_SUBSCRIPTION_KEY") || set("MOMO_COLLECTION_URL");
    default:
      return false;
  }
}

/**
 * Master Admin: configure all payment provider credentials in Mongo (encrypted).
 * Takes effect at runtime — no Vercel redeploy required for server-side rails.
 */
export function MasterUgMomoCredentials() {
  const [rails, setRails] = useState<RailStatus[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetchJson("/api/master/deployment-env?skipAutonomous=1", { credentials: "include" });
      const parsed = await readJsonResponse<{
        groups: {
          id: string;
          title: string;
          configured: boolean;
          vars: {
            name: string;
            label: string;
            sensitive: boolean;
            set: boolean;
            maskedPreview: string | null;
          }[];
        }[];
      }>(r);
      if (!parsed.ok) throw new Error(parsed.error);
      const next: RailStatus[] = [];
      for (const id of RAIL_ORDER) {
        const g = parsed.data.groups.find((x) => x.id === id);
        if (!g) continue;
        const vars = g.vars.map((v) => ({
          name: v.name,
          label: v.label,
          sensitive: v.sensitive,
          set: v.set,
          maskedPreview: v.maskedPreview,
        }));
        next.push({
          id,
          title: g.title,
          configured: isRailConfigured(id, vars),
          vars,
        });
      }
      setRails(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load payment provider credentials");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveRail(railId: string) {
    const rail = rails.find((x) => x.id === railId);
    if (!rail) return;
    const patch: Record<string, string | null> = {};
    for (const v of rail.vars) {
      if (Object.prototype.hasOwnProperty.call(drafts, v.name)) {
        const raw = drafts[v.name] ?? "";
        patch[v.name] = raw.trim() === "" ? null : raw.trim();
      }
    }
    if (Object.keys(patch).length === 0) {
      setError("Enter at least one value to save (or clear).");
      return;
    }
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const r = await fetch("/api/master/deployment-env", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ updates: patch }),
      });
      const parsed = await readJsonResponse<{ ok?: boolean; error?: string; summary?: unknown }>(r);
      if (!parsed.ok) throw new Error(parsed.error || "Save failed");
      setDrafts((d) => {
        const next = { ...d };
        for (const k of Object.keys(patch)) delete next[k];
        return next;
      });
      setSuccess(
        `${rail.title} saved to Master overrides — live within ~30s on all servers (no redeploy). Optional Vercel sync is backup only.`,
      );
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  const anyLive = rails.some((r) => r.configured && r.id !== "momo");

  return (
    <section
      id="ug-momo-credentials"
      className="rounded-xl border border-emerald-500/30 bg-emerald-950/15 p-5 shadow-[0_0_0_1px_rgba(16,185,129,0.06)]"
    >
      <h2 className="text-sm font-semibold text-emerald-100">Payment provider credentials (MAC live)</h2>
      <p className="mt-2 max-w-3xl text-xs leading-relaxed text-slate-400">
        Configure <strong className="text-slate-300">LivePay, Relworx, VixonPay, Mbiyo, and MoMo bridge</strong> fully
        here. Values are encrypted in MongoDB and override Vercel /{" "}
        <code className="text-slate-500">.env</code> at <strong className="text-slate-300">runtime</strong> —{" "}
        <strong className="text-emerald-200/90">no redeploy required</strong>. Also editable under{" "}
        <Link href="#deployment-environment" className="text-cyan-300 underline hover:text-cyan-200">
          Deployment environment
        </Link>
        . Enable/disable rails for checkout in{" "}
        <Link href="#payment-providers" className="text-cyan-300 underline hover:text-cyan-200">
          Payment providers
        </Link>
        .
      </p>

      {anyLive ? (
        <p className="mt-3 rounded-lg border border-emerald-500/30 bg-emerald-950/40 px-3 py-2 text-xs text-emerald-100">
          At least one collect rail is configured — UG checkout / OPGB card MoMo can go live (subject to policy toggles).
        </p>
      ) : (
        <p className="mt-3 rounded-lg border border-amber-500/30 bg-amber-950/30 px-3 py-2 text-xs text-amber-100">
          No collect API keys yet. Save LivePay, Relworx, VixonPay, or Mbiyo below to go live without redeploying.
        </p>
      )}

      {loading ? <p className="mt-4 text-sm text-slate-500">Loading…</p> : null}
      {error ? <p className="mt-3 text-sm text-rose-400">{error}</p> : null}
      {success ? <p className="mt-3 text-sm text-emerald-400">{success}</p> : null}

      <div className="mt-5 space-y-4">
        {rails.map((rail) => (
          <article
            key={rail.id}
            id={`deployment-env-${rail.id}`}
            className="rounded-lg border border-white/10 bg-black/25 p-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-white">{rail.title}</h3>
              <span
                className={`text-[10px] font-semibold uppercase tracking-wide ${
                  rail.configured ? "text-emerald-400" : "text-slate-500"
                }`}
              >
                {rail.configured ? "Configured" : "Not configured"}
              </span>
            </div>
            <div className="mt-3 space-y-3">
              {rail.vars.map((v) => (
                <label key={v.name} className="block text-xs">
                  <span className="text-slate-400">
                    {v.label}{" "}
                    <span className="font-mono text-[10px] text-slate-600">({v.name})</span>
                    {v.set ? (
                      <span className="ml-2 text-emerald-500/90">
                        set{v.maskedPreview ? ` · ${v.maskedPreview}` : ""}
                      </span>
                    ) : (
                      <span className="ml-2 text-slate-600">unset</span>
                    )}
                  </span>
                  {v.sensitive ? (
                    <PasswordRevealInput
                      value={drafts[v.name] ?? ""}
                      onChange={(val) => setDrafts((d) => ({ ...d, [v.name]: val }))}
                      placeholder={v.set ? "•••••••• (leave blank to keep)" : "Paste key"}
                      className="mt-1 w-full rounded-lg border border-white/10 bg-[#0d1526] px-3 py-2 font-mono text-xs text-white"
                    />
                  ) : (
                    <input
                      value={drafts[v.name] ?? ""}
                      onChange={(e) => setDrafts((d) => ({ ...d, [v.name]: e.target.value }))}
                      placeholder={v.set ? "(leave blank to keep)" : "Enter value"}
                      className="mt-1 w-full rounded-lg border border-white/10 bg-[#0d1526] px-3 py-2 font-mono text-xs text-white"
                    />
                  )}
                </label>
              ))}
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={() => void saveRail(rail.id)}
              className="mt-4 rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-600 disabled:opacity-50"
            >
              {busy ? "Saving…" : `Save ${rail.title}`}
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
