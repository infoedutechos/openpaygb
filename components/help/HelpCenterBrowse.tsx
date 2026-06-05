"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { PlatformHub } from "@/lib/knowledge-base/types";

type ArticleCard = {
  slug: string;
  title: string;
  summary: string;
  excerpt: string;
  category: string;
  tags: string[];
  audience: string;
};

const HUBS: { id: PlatformHub; label: string }[] = [
  { id: "all", label: "All" },
  { id: "tuition", label: "Tuition & pay" },
  { id: "play", label: "URAPearls" },
  { id: "admin", label: "School admin" },
];

export default function HelpCenterBrowse() {
  const [hub, setHub] = useState<PlatformHub>("all");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [articles, setArticles] = useState<ArticleCard[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [searchHits, setSearchHits] = useState<ArticleCard[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadArticles = useCallback(async (nextHub: PlatformHub) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/knowledge/articles?hub=${encodeURIComponent(nextHub)}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Could not load articles");
      const data = (await res.json()) as { articles?: ArticleCard[]; categories?: string[] };
      setArticles(Array.isArray(data.articles) ? data.articles : []);
      setCategories(Array.isArray(data.categories) ? data.categories : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed");
      setArticles([]);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadArticles(hub);
    setCategory("all");
    setSearchHits(null);
  }, [hub, loadArticles]);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setSearchHits(null);
      return;
    }

    const handle = setTimeout(() => {
      void (async () => {
        setSearching(true);
        try {
          const res = await fetch(
            `/api/knowledge/search?q=${encodeURIComponent(q)}&hub=${encodeURIComponent(hub)}&limit=20`,
          );
          if (!res.ok) throw new Error("Search failed");
          const data = (await res.json()) as {
            hits?: Array<{
              slug: string;
              title: string;
              summary: string;
              excerpt: string;
              category: string;
              tags: string[];
            }>;
          };
          setSearchHits(
            (data.hits ?? []).map((h) => ({
              slug: h.slug,
              title: h.title,
              summary: h.summary,
              excerpt: h.excerpt,
              category: h.category,
              tags: h.tags,
              audience: hub,
            })),
          );
        } catch {
          setSearchHits([]);
        } finally {
          setSearching(false);
        }
      })();
    }, 280);

    return () => clearTimeout(handle);
  }, [query, hub]);

  const visible = useMemo(() => {
    const base = searchHits ?? articles;
    if (category === "all") return base;
    return base.filter((a) => a.category === category);
  }, [articles, category, searchHits]);

  const grouped = useMemo(() => {
    const map = new Map<string, ArticleCard[]>();
    for (const a of visible) {
      const list = map.get(a.category) ?? [];
      list.push(a);
      map.set(a.category, list);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [visible]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 pb-24">
      <div className="mb-8">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-sky-400/90">Help center</p>
        <h1 className="mt-2 text-3xl font-semibold text-white">Knowledge base</h1>
        <p className="mt-3 max-w-2xl text-sm text-slate-400">
          Browse guides for tuition payments, school admin, and URAPearls. Answers in the floating{" "}
          <strong className="font-medium text-slate-300">Help</strong> chat come from these articles — no paid AI API.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {HUBS.map((h) => (
          <button
            key={h.id}
            type="button"
            onClick={() => setHub(h.id)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold border transition-colors ${
              hub === h.id
                ? "border-sky-400/60 bg-sky-500/20 text-sky-100"
                : "border-white/10 bg-white/[0.04] text-slate-400 hover:text-slate-200"
            }`}
          >
            {h.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center mb-6">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search articles…"
          className="flex-1 rounded-xl border border-white/10 bg-[#14171c] px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/35"
        />
        {categories.length > 0 ? (
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded-xl border border-white/10 bg-[#14171c] px-3 py-2.5 text-sm text-white"
          >
            <option value="all">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        ) : null}
      </div>

      {error ? <p className="text-sm text-rose-400 mb-4">{error}</p> : null}
      {loading ? <p className="text-sm text-slate-500">Loading articles…</p> : null}
      {searching ? <p className="text-xs text-slate-500 mb-3">Searching…</p> : null}

      {!loading && visible.length === 0 ? (
        <p className="text-sm text-slate-500">No articles match your filters.</p>
      ) : null}

      <div className="space-y-8">
        {grouped.map(([cat, items]) => (
          <section key={cat}>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-3">{cat}</h2>
            <ul className="grid gap-3 sm:grid-cols-2">
              {items.map((a) => (
                <li key={a.slug}>
                  <Link
                    href={`/help/${a.slug}`}
                    className="block h-full rounded-xl border border-white/10 bg-[#14171c]/80 p-4 hover:border-sky-500/35 hover:bg-[#161b22] transition-colors"
                  >
                    <h3 className="text-sm font-semibold text-white">{a.title}</h3>
                    <p className="mt-2 text-xs text-slate-400 line-clamp-3">
                      {a.summary || a.excerpt}
                    </p>
                    {a.tags.length > 0 ? (
                      <p className="mt-3 text-[10px] text-slate-600">{a.tags.slice(0, 4).join(" · ")}</p>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
