"use client";

import { useCallback, useEffect, useState } from "react";

type Placement = { id: string; title: string; surface: string; code: string };
type Campaign = {
  id: string;
  name: string;
  status: string;
  budgetMinor: number;
  creative: { title: string };
  placement: Placement;
};

type Props = {
  /** API base that lists/creates campaigns for this role */
  listUrl: string;
  createUrl: string;
  credentials?: RequestCredentials;
  extraBody?: Record<string, unknown>;
  title?: string;
  subtitle?: string;
};

export function AdvertisePanel({
  listUrl,
  createUrl,
  credentials = "include",
  extraBody,
  title = "Advertise",
  subtitle = "Create campaigns for web dashboards and Telegram. Submitted campaigns may require Master Admin approval.",
}: Props) {
  const [placements, setPlacements] = useState<Placement[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [adTitle, setAdTitle] = useState("");
  const [body, setBody] = useState("");
  const [ctaHref, setCtaHref] = useState("");
  const [placementId, setPlacementId] = useState("");
  const [budgetMinor, setBudgetMinor] = useState(10000);
  const [hubs, setHubs] = useState("all");
  const [roles, setRoles] = useState("");
  const [geoCountries, setGeoCountries] = useState("");
  const [telegramOnly, setTelegramOnly] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    const r = await fetch(listUrl, { credentials });
    if (!r.ok) {
      setError("Could not load ads");
      return;
    }
    const j = (await r.json()) as { placements?: Placement[]; campaigns?: Campaign[] };
    setPlacements(j.placements ?? []);
    setCampaigns(j.campaigns ?? []);
    setPlacementId((prev) => prev || j.placements?.[0]?.id || "");
  }, [credentials, listUrl]);

  useEffect(() => {
    void load();
  }, [load]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const r = await fetch(createUrl, {
        method: "POST",
        credentials,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...extraBody,
          name,
          creativeTitle: adTitle,
          creativeBody: body,
          ctaHref,
          placementId,
          budgetMinor,
          targeting: {
            hubs: hubs.split(",").map((s) => s.trim()).filter(Boolean),
            roles: roles.split(",").map((s) => s.trim()).filter(Boolean),
            geoCountries: geoCountries.split(",").map((s) => s.trim()).filter(Boolean),
            telegramOnly: telegramOnly || undefined,
          },
        }),
      });
      if (!r.ok) {
        const j = (await r.json().catch(() => null)) as { error?: string } | null;
        throw new Error(j?.error || "Create failed");
      }
      setName("");
      setAdTitle("");
      setBody("");
      setCtaHref("");
      setMessage("Campaign submitted.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">{title}</h1>
        <p className="text-sm text-slate-400">{subtitle}</p>
      </div>
      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
      {message ? <p className="text-sm text-emerald-300">{message}</p> : null}

      <form
        onSubmit={(e) => void create(e)}
        className="grid max-w-xl gap-3 rounded-xl border border-white/10 bg-[#0a101f] p-4"
      >
        <input
          required
          placeholder="Campaign name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-white"
        />
        <select
          required
          value={placementId}
          onChange={(e) => setPlacementId(e.target.value)}
          className="rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-white"
        >
          {placements.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title} · {p.surface}
            </option>
          ))}
        </select>
        <input
          required
          placeholder="Ad title"
          value={adTitle}
          onChange={(e) => setAdTitle(e.target.value)}
          className="rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-white"
        />
        <textarea
          placeholder="Ad body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          className="rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-white"
        />
        <input
          placeholder="Link URL"
          value={ctaHref}
          onChange={(e) => setCtaHref(e.target.value)}
          className="rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-white"
        />
        <input
          type="number"
          min={0}
          value={budgetMinor}
          onChange={(e) => setBudgetMinor(Number(e.target.value) || 0)}
          className="rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-white"
        />
        <p className="text-xs font-medium text-slate-400">Targeting</p>
        <input
          placeholder="Hubs (comma): all, tuition, play, schools"
          value={hubs}
          onChange={(e) => setHubs(e.target.value)}
          className="rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-white"
        />
        <input
          placeholder="Roles (comma): student, org_admin, staff"
          value={roles}
          onChange={(e) => setRoles(e.target.value)}
          className="rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-white"
        />
        <input
          placeholder="Countries (comma): UG, KE"
          value={geoCountries}
          onChange={(e) => setGeoCountries(e.target.value)}
          className="rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-white"
        />
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input type="checkbox" checked={telegramOnly} onChange={(e) => setTelegramOnly(e.target.checked)} />
          Telegram only
        </label>
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          Submit campaign
        </button>
      </form>

      <div className="space-y-2">
        <h2 className="text-sm font-medium text-white">Your campaigns</h2>
        {campaigns.length === 0 ? (
          <p className="text-sm text-slate-500">No campaigns yet.</p>
        ) : (
          campaigns.map((c) => (
            <div key={c.id} className="rounded-lg border border-white/10 bg-[#0a101f] px-3 py-2 text-sm">
              <p className="font-medium text-white">{c.name}</p>
              <p className="text-xs text-slate-500">
                {c.status} · {c.placement.title} · budget {c.budgetMinor.toLocaleString()} UGX
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
