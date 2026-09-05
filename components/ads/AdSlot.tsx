"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type Ad = {
  campaignId: string;
  title: string;
  body: string;
  imageUrl: string | null;
  ctaLabel: string;
  ctaHref: string;
};

/**
 * Web placement slot — loads active ads for a placement code and records impressions/clicks.
 */
export function AdSlot({
  placement = "web_dashboard_sidebar",
  hub = "all",
  className = "",
}: {
  placement?: string;
  hub?: string;
  className?: string;
}) {
  const [ads, setAds] = useState<Ad[]>([]);

  const load = useCallback(async () => {
    try {
      const r = await fetch(
        `/api/public/ads/serve?placement=${encodeURIComponent(placement)}&hub=${encodeURIComponent(hub)}`,
        { credentials: "omit" },
      );
      if (!r.ok) return;
      const j = (await r.json()) as { ads?: Ad[] };
      const list = j.ads ?? [];
      setAds(list);
      for (const ad of list.slice(0, 3)) {
        void fetch("/api/public/ads/serve", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ campaignId: ad.campaignId, kind: "impression" }),
        });
      }
    } catch {
      /* ignore */
    }
  }, [hub, placement]);

  useEffect(() => {
    void load();
  }, [load]);

  if (ads.length === 0) return null;
  const ad = ads[0]!;

  return (
    <aside
      className={`rounded-xl border border-violet-500/20 bg-violet-950/20 p-3 text-sm ${className}`}
      data-ad-placement={placement}
    >
      <p className="text-[10px] uppercase tracking-wide text-violet-300/70">Sponsored</p>
      <p className="mt-1 font-medium text-white">{ad.title}</p>
      {ad.body ? <p className="mt-1 text-xs text-slate-400 line-clamp-3">{ad.body}</p> : null}
      {ad.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={ad.imageUrl} alt="" className="mt-2 max-h-24 w-full rounded-lg object-cover" />
      ) : null}
      {ad.ctaHref ? (
        <Link
          href={ad.ctaHref}
          className="mt-2 inline-block text-xs font-semibold text-violet-200 underline-offset-2 hover:underline"
          onClick={() => {
            void fetch("/api/public/ads/serve", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ campaignId: ad.campaignId, kind: "click" }),
            });
          }}
        >
          {ad.ctaLabel || "Learn more"}
        </Link>
      ) : null}
    </aside>
  );
}
