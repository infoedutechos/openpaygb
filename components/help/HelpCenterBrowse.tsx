"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
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

const HUBS: { id: PlatformHub; label: string; blurb: string }[] = [
  {
    id: "all",
    label: "All",
    blurb: "Search the full ODEL HUB ecosystem FAQ — tuition, OpenPayGB, Dex, schools, and URAPearls.",
  },
  {
    id: "tuition",
    label: "Tuition & pay",
    blurb: "Guest checkout, receipts, TON/MoMo rails, student portal, and school term fees.",
  },
  {
    id: "dex",
    label: "OpenPayGB & Dex",
    blurb: "OPGB settlement, wallet, Dex buy/sell/convert, developer APIs, and integrator guides.",
  },
  {
    id: "play",
    label: "URAPearls",
    blurb: "Telegram mini-app, tasks, and Play Hub gamification.",
  },
  {
    id: "admin",
    label: "School admin",
    blurb: "Workspace registration, school admin login, programmes, and master approval.",
  },
];

const QUICK_LINKS: Record<PlatformHub, { label: string; href: string }[]> = {
  all: [
    { label: "Student guide (schools)", href: "/help/guide-student-schools" },
    { label: "Student guide (higher)", href: "/help/guide-student-higher" },
    { label: "Admin guide (schools)", href: "/help/guide-admin-schools" },
    { label: "Admin guide (higher)", href: "/help/guide-admin-higher" },
    { label: "User guides index", href: "/api/docs/guides/USER_GUIDE_INDEX.md" },
    { label: "Platform terms", href: "/policies/terms" },
    { label: "Developers", href: "/developers" },
    { label: "Help chat", href: "/help" },
  ],
  tuition: [
    { label: "Student guide (schools)", href: "/help/guide-student-schools" },
    { label: "Student guide (higher)", href: "/help/guide-student-higher" },
    { label: "Pay tuition", href: "/pay" },
    { label: "Student sign in", href: "/student/login" },
    { label: "Riverside demo", href: "/pay/riverside-demo" },
  ],
  dex: [
    { label: "OpenPayGB lobby", href: "/opgb" },
    { label: "Dex Hub", href: "/dex" },
    { label: "Developer dashboard", href: "/developers/dashboard" },
    { label: "Risk disclosure", href: "/policies/risk-disclosure" },
  ],
  play: [
    { label: "Play Hub", href: "/clicker" },
    { label: "URAPearls terms", href: "/clicker/terms" },
    { label: "URAPearls privacy", href: "/clicker/privacy" },
  ],
  admin: [
    { label: "Admin guide (schools)", href: "/help/guide-admin-schools" },
    { label: "Admin guide (higher)", href: "/help/guide-admin-higher" },
    { label: "Register school", href: "/admin/register?segment=schools" },
    { label: "School admin sign in", href: "/admin/login?school=1" },
    { label: "Master console", href: "/admin/login?master=1" },
  ],
};

const FEATURED_SLUGS: Partial<Record<PlatformHub, string[]>> = {
  dex: [
    "opgb-settlement-token",
    "dex-buy-sell-convert",
    "opgb-dex-partner-api",
    "integrate-odel-hub",
    "openpay-card-overview",
  ],
  tuition: [
    "guide-student-schools",
    "guide-student-higher",
    "tuition-pay-guest",
    "riverside-demo-school",
    "ton-connect-pay",
    "mobile-money-rails",
  ],
  admin: [
    "guide-admin-schools",
    "guide-admin-higher",
    "admission-number-format",
    "school-admin-login",
    "workspace-registration",
    "riverside-demo-school",
  ],
};

function hubFromParam(raw: string | null): PlatformHub {
  if (raw === "tuition" || raw === "play" || raw === "admin" || raw === "dex" || raw === "all") return raw;
  return "all";
}

export default function HelpCenterBrowse() {
  const searchParams = useSearchParams();
  const initialHub = hubFromParam(searchParams.get("hub"));

  const [hub, setHub] = useState<PlatformHub>(initialHub);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [articles, setArticles] = useState<ArticleCard[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [searchHits, setSearchHits] = useState<ArticleCard[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setHub(hubFromParam(searchParams.get("hub")));
  }, [searchParams]);

  const hubMeta = HUBS.find((h) => h.id === hub) ?? HUBS[0];

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

  const featured = useMemo(() => {
    const slugs = FEATURED_SLUGS[hub] ?? [];
    if (slugs.length === 0 || searchHits) return [];
    const bySlug = new Map(articles.map((a) => [a.slug, a]));
    return slugs.map((s) => bySlug.get(s)).filter(Boolean) as ArticleCard[];
  }, [articles, hub, searchHits]);

  const grouped = useMemo(() => {
    const featuredSet = new Set(featured.map((f) => f.slug));
    const rest = visible.filter((a) => !featuredSet.has(a.slug));
    const map = new Map<string, ArticleCard[]>();
    for (const a of rest) {
      const list = map.get(a.category) ?? [];
      list.push(a);
      map.set(a.category, list);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [visible, featured]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 pb-24">
      <div className="mb-8">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-sky-400/90">Ecosystem FAQ</p>
        <h1 className="mt-2 text-3xl font-semibold text-white">Help center</h1>
        <p className="mt-3 max-w-2xl text-sm text-slate-400">{hubMeta.blurb}</p>
        <p className="mt-2 text-xs text-slate-500">
          Live searchable articles — also used by the floating <strong className="text-slate-400">Help</strong>{" "}
          copilot (no paid AI API).
        </p>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {QUICK_LINKS[hub].map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-medium text-slate-300 hover:border-sky-400/35 hover:text-sky-100"
          >
            {link.label}
          </Link>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {HUBS.map((h) => (
          <Link
            key={h.id}
            href={h.id === "all" ? "/help" : `/help?hub=${h.id}`}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold border transition-colors ${
              hub === h.id
                ? h.id === "dex"
                  ? "border-violet-400/60 bg-violet-500/20 text-violet-100"
                  : "border-sky-400/60 bg-sky-500/20 text-sky-100"
                : "border-white/10 bg-white/[0.04] text-slate-400 hover:text-slate-200"
            }`}
          >
            {h.label}
          </Link>
        ))}
      </div>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search ecosystem FAQ…"
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

      {error ? <p className="mb-4 text-sm text-rose-400">{error}</p> : null}
      {loading ? <p className="text-sm text-slate-500">Loading articles…</p> : null}
      {searching ? <p className="mb-3 text-xs text-slate-500">Searching…</p> : null}

      {featured.length > 0 ? (
        <section className="mb-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-violet-300/90">Featured</h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {featured.map((a) => (
              <li key={a.slug}>
                <Link
                  href={`/help/${a.slug}`}
                  className="block h-full rounded-xl border border-violet-500/25 bg-violet-950/20 p-4 hover:border-violet-400/40 transition-colors"
                >
                  <h3 className="text-sm font-semibold text-white">{a.title}</h3>
                  <p className="mt-2 text-xs text-slate-400 line-clamp-3">{a.summary || a.excerpt}</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {!loading && visible.length === 0 ? (
        <p className="text-sm text-slate-500">No articles match your filters.</p>
      ) : null}

      <div className="space-y-8">
        {grouped.map(([cat, items]) => (
          <section key={cat}>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">{cat}</h2>
            <ul className="grid gap-3 sm:grid-cols-2">
              {items.map((a) => (
                <li key={a.slug}>
                  <Link
                    href={`/help/${a.slug}`}
                    className="block h-full rounded-xl border border-white/10 bg-[#14171c]/80 p-4 hover:border-sky-500/35 hover:bg-[#161b22] transition-colors"
                  >
                    <h3 className="text-sm font-semibold text-white">{a.title}</h3>
                    <p className="mt-2 text-xs text-slate-400 line-clamp-3">{a.summary || a.excerpt}</p>
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
