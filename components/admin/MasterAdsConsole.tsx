"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchJson } from "@/utils/fetch-json";
import { readJsonResponse } from "@/utils/read-json-response";

type Placement = {
  id: string;
  code: string;
  title: string;
  surface: string;
  hub: string;
  isActive: boolean;
};

type Creative = {
  id: string;
  title: string;
  body: string;
  format: string;
  ctaHref: string;
};

type Campaign = {
  id: string;
  name: string;
  status: string;
  budgetMinor: number;
  spentMinor: number;
  impressions: number;
  clicks: number;
  rejectedReason: string;
  creative: Creative;
  placement: Placement;
  targeting?: { hubs?: string[]; roles?: string[] };
  createdAt: string;
};

type Settings = {
  enabled: boolean;
  autoApproveTrusted: boolean;
  requireMasterApproval: boolean;
  platformFeeBps: number;
  minBudgetMinor: number;
  defaultDailyCapMinor: number;
  telegramDeliveryEnabled: boolean;
  webDeliveryEnabled: boolean;
};

type Analytics = {
  byStatus: Record<string, number>;
  impressions: number;
  clicks: number;
  spendMinor: number;
  platformFeeMinor: number;
};

export function MasterAdsConsole() {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [placements, setPlacements] = useState<Placement[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);

  const [name, setName] = useState("");
  const [creativeTitle, setCreativeTitle] = useState("");
  const [creativeBody, setCreativeBody] = useState("");
  const [ctaHref, setCtaHref] = useState("");
  const [placementId, setPlacementId] = useState("");
  const [budgetMinor, setBudgetMinor] = useState(10000);
  const [hubs, setHubs] = useState("all");
  const [roles, setRoles] = useState("org_admin,student");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetchJson("/api/master/ads", { credentials: "include" });
      const parsed = await readJsonResponse<{
        settings: Settings;
        placements: Placement[];
        campaigns: Campaign[];
        analytics: Analytics;
      }>(r);
      if (!parsed.ok) throw new Error(parsed.error);
      setSettings(parsed.data.settings);
      setPlacements(parsed.data.placements ?? []);
      setCampaigns(parsed.data.campaigns ?? []);
      setAnalytics(parsed.data.analytics);
      setPlacementId((prev) => prev || parsed.data.placements?.[0]?.id || "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load ads console");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveSettings(patch: Partial<Settings>) {
    if (!settings) return;
    setBusy(true);
    setError(null);
    try {
      const r = await fetch("/api/master/ads", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: patch }),
      });
      const parsed = await readJsonResponse<{ settings: Settings }>(r);
      if (!parsed.ok) throw new Error(parsed.error);
      setSettings(parsed.data.settings);
      setMessage("Ads settings saved.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function createCampaign(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !creativeTitle.trim() || !placementId) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const r = await fetch("/api/master/ads", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          creativeTitle: creativeTitle.trim(),
          creativeBody: creativeBody.trim(),
          ctaHref: ctaHref.trim(),
          placementId,
          budgetMinor,
          targeting: {
            hubs: hubs.split(",").map((s) => s.trim()).filter(Boolean),
            roles: roles.split(",").map((s) => s.trim()).filter(Boolean),
          },
          submitForReview: true,
        }),
      });
      const parsed = await readJsonResponse(r);
      if (!parsed.ok) throw new Error(parsed.error);
      setName("");
      setCreativeTitle("");
      setCreativeBody("");
      setCtaHref("");
      setMessage("Campaign created and submitted for review.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setBusy(false);
    }
  }

  async function campaignAction(
    id: string,
    action: string,
    extra?: { note?: string; deliverTelegram?: boolean; amountMinor?: number },
  ) {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const r = await fetch(`/api/master/ads/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      const parsed = await readJsonResponse(r);
      if (!parsed.ok) throw new Error(parsed.error);
      setMessage(`Campaign ${action} succeeded.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      id="ads-console"
      className="rounded-xl border border-violet-500/25 bg-[#0a101f] p-5 text-slate-200 shadow-lg shadow-black/20"
    >
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">Ads platform</h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-400">
            Campaigns, creatives, placements, targeting, approval, OpenPayGB spend hooks, and delivery
            analytics. Phase 1 MAC console — role dashboards and full Telegram autonomy follow the ads
            plan.
          </p>
        </div>
        <button
          type="button"
          disabled={busy || loading}
          onClick={() => void load()}
          className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-slate-300 hover:bg-white/5"
        >
          Refresh
        </button>
      </div>

      {error ? <p className="mb-3 text-sm text-rose-300">{error}</p> : null}
      {message ? <p className="mb-3 text-sm text-emerald-300">{message}</p> : null}

      {loading ? (
        <p className="text-sm text-slate-500">Loading ads console…</p>
      ) : (
        <div className="space-y-6">
          {analytics ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: "Impressions", value: analytics.impressions },
                { label: "Clicks", value: analytics.clicks },
                { label: "Spend (UGX)", value: analytics.spendMinor },
                { label: "Platform fee (UGX)", value: analytics.platformFeeMinor },
              ].map((c) => (
                <div key={c.label} className="rounded-lg border border-white/10 bg-black/20 px-3 py-3">
                  <p className="text-[11px] uppercase tracking-wide text-slate-500">{c.label}</p>
                  <p className="mt-1 text-xl font-semibold text-white">{c.value.toLocaleString()}</p>
                </div>
              ))}
            </div>
          ) : null}

          {settings ? (
            <div className="rounded-lg border border-white/10 bg-black/20 p-4">
              <h3 className="text-sm font-medium text-white">Platform settings</h3>
              <div className="mt-3 flex flex-wrap gap-4 text-sm">
                {(
                  [
                    ["enabled", "Ads enabled"],
                    ["requireMasterApproval", "Require MAC approval"],
                    ["autoApproveTrusted", "Auto-approve trusted"],
                    ["telegramDeliveryEnabled", "Telegram delivery"],
                    ["webDeliveryEnabled", "Web delivery"],
                  ] as const
                ).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 text-slate-300">
                    <input
                      type="checkbox"
                      checked={Boolean(settings[key])}
                      disabled={busy}
                      onChange={(e) => void saveSettings({ [key]: e.target.checked })}
                    />
                    {label}
                  </label>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap gap-3 text-sm">
                <label className="flex items-center gap-2 text-slate-400">
                  Fee (bps)
                  <input
                    type="number"
                    className="w-24 rounded border border-white/15 bg-black/40 px-2 py-1 text-white"
                    value={settings.platformFeeBps}
                    disabled={busy}
                    onChange={(e) =>
                      setSettings({ ...settings, platformFeeBps: Number(e.target.value) || 0 })
                    }
                    onBlur={() => void saveSettings({ platformFeeBps: settings.platformFeeBps })}
                  />
                </label>
                <label className="flex items-center gap-2 text-slate-400">
                  Default daily cap
                  <input
                    type="number"
                    className="w-28 rounded border border-white/15 bg-black/40 px-2 py-1 text-white"
                    value={settings.defaultDailyCapMinor}
                    disabled={busy}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        defaultDailyCapMinor: Number(e.target.value) || 0,
                      })
                    }
                    onBlur={() =>
                      void saveSettings({ defaultDailyCapMinor: settings.defaultDailyCapMinor })
                    }
                  />
                </label>
              </div>
            </div>
          ) : null}

          <form
            onSubmit={(e) => void createCampaign(e)}
            className="grid gap-3 rounded-lg border border-white/10 bg-black/20 p-4 md:grid-cols-2"
          >
            <h3 className="md:col-span-2 text-sm font-medium text-white">Create campaign</h3>
            <input
              required
              placeholder="Campaign name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white"
            />
            <select
              required
              value={placementId}
              onChange={(e) => setPlacementId(e.target.value)}
              className="rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white"
            >
              {placements.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title} · {p.surface} ({p.code})
                </option>
              ))}
            </select>
            <input
              required
              placeholder="Creative title"
              value={creativeTitle}
              onChange={(e) => setCreativeTitle(e.target.value)}
              className="rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white"
            />
            <input
              type="number"
              min={0}
              placeholder="Budget (UGX)"
              value={budgetMinor}
              onChange={(e) => setBudgetMinor(Number(e.target.value) || 0)}
              className="rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white"
            />
            <textarea
              placeholder="Creative body"
              value={creativeBody}
              onChange={(e) => setCreativeBody(e.target.value)}
              rows={3}
              className="md:col-span-2 rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white"
            />
            <input
              placeholder="CTA href"
              value={ctaHref}
              onChange={(e) => setCtaHref(e.target.value)}
              className="rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white"
            />
            <input
              placeholder="Target hubs (comma)"
              value={hubs}
              onChange={(e) => setHubs(e.target.value)}
              className="rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white"
            />
            <input
              placeholder="Target roles (comma)"
              value={roles}
              onChange={(e) => setRoles(e.target.value)}
              className="md:col-span-2 rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white"
            />
            <button
              type="submit"
              disabled={busy}
              className="md:col-span-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-50"
            >
              Create & submit for review
            </button>
          </form>

          <div>
            <h3 className="mb-2 text-sm font-medium text-white">Placements</h3>
            <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {placements.map((p) => (
                <li key={p.id} className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs">
                  <p className="font-medium text-slate-100">{p.title}</p>
                  <p className="text-slate-500">
                    {p.surface} · {p.hub} · {p.code}
                  </p>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-medium text-white">Campaigns</h3>
            <div className="space-y-3">
              {campaigns.length === 0 ? (
                <p className="text-sm text-slate-500">No campaigns yet.</p>
              ) : (
                campaigns.map((c) => (
                  <div
                    key={c.id}
                    className="rounded-lg border border-white/10 bg-black/20 p-3 text-sm"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-white">{c.name}</p>
                        <p className="text-xs text-slate-500">
                          {c.status} · {c.placement.title} · {c.creative.title}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          Budget {c.budgetMinor.toLocaleString()} · Spent {c.spentMinor.toLocaleString()} ·{" "}
                          {c.impressions} imp / {c.clicks} clk
                        </p>
                        {c.rejectedReason ? (
                          <p className="mt-1 text-xs text-rose-300">{c.rejectedReason}</p>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {c.status === "pending_review" || c.status === "draft" ? (
                          <>
                            <button
                              type="button"
                              disabled={busy}
                              className="rounded border border-emerald-500/40 px-2 py-1 text-xs text-emerald-200"
                              onClick={() =>
                                void campaignAction(c.id, "approve", { deliverTelegram: false })
                              }
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              disabled={busy}
                              className="rounded border border-rose-500/40 px-2 py-1 text-xs text-rose-200"
                              onClick={() =>
                                void campaignAction(c.id, "reject", { note: "Rejected in MAC" })
                              }
                            >
                              Reject
                            </button>
                          </>
                        ) : null}
                        {c.status === "approved" || c.status === "paused" ? (
                          <button
                            type="button"
                            disabled={busy}
                            className="rounded border border-cyan-500/40 px-2 py-1 text-xs text-cyan-100"
                            onClick={() =>
                              void campaignAction(c.id, "activate", { deliverTelegram: true })
                            }
                          >
                            Activate + Telegram
                          </button>
                        ) : null}
                        {c.status === "active" ? (
                          <button
                            type="button"
                            disabled={busy}
                            className="rounded border border-amber-500/40 px-2 py-1 text-xs text-amber-100"
                            onClick={() => void campaignAction(c.id, "pause")}
                          >
                            Pause
                          </button>
                        ) : null}
                        <button
                          type="button"
                          disabled={busy}
                          className="rounded border border-white/20 px-2 py-1 text-xs text-slate-300"
                          onClick={() =>
                            void campaignAction(c.id, "record_spend", { amountMinor: 1000 })
                          }
                        >
                          +1k spend
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
