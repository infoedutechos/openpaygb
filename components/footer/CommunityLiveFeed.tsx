"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type FeedItem = {
  id: string;
  kind: "activity" | "announcement";
  title: string;
  body: string;
  href: string | null;
  linkLabel: string | null;
  createdAt: string;
};

export function CommunityLiveFeed({ className = "" }: { className?: string }) {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/public/community-feed?limit=4", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { items?: FeedItem[] };
        if (!cancelled) setItems(Array.isArray(data.items) ? data.items : []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return <p className={`text-xs text-slate-500 ${className}`}>Loading live feed…</p>;
  }
  if (items.length === 0) return null;

  return (
    <ul className={`space-y-2 ${className}`} aria-label="Community live feed">
      {items.map((item) => (
        <li
          key={item.id}
          className="rounded-lg border border-white/10 bg-slate-950/40 px-3 py-2"
        >
          <p className="text-[11px] font-semibold text-cyan-200">{item.title}</p>
          {item.body ? (
            <p className="mt-0.5 line-clamp-2 text-[10px] leading-relaxed text-slate-400">{item.body}</p>
          ) : null}
          <div className="mt-1 flex items-center justify-between gap-2">
            <span className="text-[9px] uppercase tracking-wide text-slate-500">
              {item.kind} · {new Date(item.createdAt).toLocaleDateString()}
            </span>
            {item.href ? (
              <Link
                href={item.href}
                className="text-[10px] font-medium text-violet-300 hover:text-violet-200"
              >
                {item.linkLabel ?? "Open"}
              </Link>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}
