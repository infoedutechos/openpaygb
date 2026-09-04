"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { PasswordRevealInput } from "@/components/PasswordRevealInput";
import { fetchJson } from "@/utils/fetch-json";
import { readJsonResponse } from "@/utils/read-json-response";

type RailStatus = {
  id: "livepay" | "relworx" | "vixonpay";
  title: string;
  configured: boolean;
  vars: { name: string; label: string; sensitive: boolean; set: boolean; maskedPreview: string | null }[];
};

/**
 * Master Admin: set LivePay / Relworx / VixonPay collect keys.
 * Any one configured rail makes OpenPayGB card MoMo (and UG checkout) fully live.
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
      const r = await fetchJson("/api/master/deployment-env", { credentials: "include" });
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
      const wanted = ["livepay", "relworx", "vixonpay"] as const;
      const next: RailStatus[] = [];
      for (const id of wanted) {
        const g = parsed.data.groups.find((x) => x.id === id);
        if (!g) continue;
        next.push({
          id,
          title: g.title,
          configured:
            id === "livepay"
              ? Boolean(
                  g.vars.find((v) => v.name === "LIVEPAY_API_KEY")?.set &&
                    g.vars.find((v) => v.name === "LIVEPAY_ACCOUNT_NUMBER")?.set,
                )
              : id === "relworx"
                ? Boolean(
                    g.vars.find((v) => v.name === "RELWORX_API_KEY")?.set &&
                      g.vars.find((v) => v.name === "RELWORX_ACCOUNT_NO")?.set,
                  )
                : Boolean(g.vars.find((v) => v.name === "VIXONPAY_API_KEY")?.set),
          vars: g.vars
            .filter((v) =>
              /API_KEY|ACCOUNT_NUMBER|ACCOUNT_NO|WEBHOOK_SECRET|WEBHOOK_KEY|RELWORX_ENABLED|RELWORX_CURRENCY/i.test(
                v.name,
              ),
            )
            .map((v) => ({
              name: v.name,
              label: v.label,
              sensitive: v.sensitive,
              set: v.set,
              maskedPreview: v.maskedPreview,
            })),
        });
      }
      setRails(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load MoMo credentials");
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
        `${rail.title} saved. Any one configured UG MoMo rail makes OpenPayGB card activate/fund fully live.`,
      );
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  const anyLive = rails.some((r) => r.configured);

  return (
    <section
      id="ug-momo-credentials"
      className="rounded-xl border border-emerald-500/30 bg-emerald-950/15 p-5 shadow-[0_0_0_1px_rgba(16,185,129,0.06)]"
    >
      <h2 className="text-sm font-semibold text-emerald-100">Uganda MoMo API keys (MTN / Airtel)</h2>
      <p className="mt-2 max-w-3xl text-xs leading-relaxed text-slate-400">
        Set <strong className="text-slate-300">any one</strong> of LivePay, Relworx, or VixonPay collect credentials
        here (or under{" "}
        <Link href="#deployment-environment" className="text-cyan-300 underline hover:text-cyan-200">
          Deployment environment
        </Link>
        ). OpenPayGB platform card activation/funding and UG checkout then use real USSD prompts. Values are encrypted
        in MongoDB and override <code className="text-slate-500">.env.local</code>.
      </p>

      {anyLive ? (
        <p className="mt-3 rounded-lg border border-emerald-500/30 bg-emerald-950/40 px-3 py-2 text-xs text-emerald-100">
          Live MoMo ready — at least one UG rail is configured.
        </p>
      ) : (
        <p className="mt-3 rounded-lg border border-amber-500/30 bg-amber-950/30 px-3 py-2 text-xs text-amber-100">
          No UG collect API keys yet. Card MoMo uses sandbox in development until you save LivePay, Relworx, or
          VixonPay below.
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
