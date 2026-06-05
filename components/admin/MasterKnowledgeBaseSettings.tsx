"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchJson } from "@/utils/fetch-json";
import { readJsonResponse } from "@/utils/read-json-response";

type ArticleRow = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  category: string;
  tags: string[];
  audience: string;
  published: boolean;
  sortOrder: number;
  source: string;
  updatedAt: string;
};

const emptyForm = {
  slug: "",
  title: "",
  summary: "",
  body: "",
  category: "general",
  tags: "",
  audience: "all" as "all" | "tuition" | "play" | "admin",
  published: true,
  sortOrder: 0,
};

export function MasterKnowledgeBaseSettings() {
  const [articles, setArticles] = useState<ArticleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchJson("/api/master/knowledge", { credentials: "include" });
      const parsed = await readJsonResponse<{ total: number; articles: ArticleRow[] }>(res);
      if (!parsed.ok) throw new Error(parsed.error);
      setArticles(parsed.data.articles ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load knowledge base");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveArticle() {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const tags = form.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      const res = await fetch("/api/master/knowledge", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          article: {
            slug: form.slug.trim(),
            title: form.title.trim(),
            summary: form.summary.trim(),
            body: form.body.trim(),
            category: form.category.trim() || "general",
            tags,
            audience: form.audience,
            published: form.published,
            sortOrder: form.sortOrder,
          },
        }),
      });
      const parsed = await readJsonResponse<{ ok?: boolean }>(res);
      if (!parsed.ok) throw new Error(parsed.error);
      setMessage("Article saved. Copilot will use it on the next question.");
      setForm(emptyForm);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function reseed() {
    if (!confirm("Re-import seed and Learn articles? Manual articles are kept.")) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/master/knowledge", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reseed: true }),
      });
      const parsed = await readJsonResponse<{ reseeded?: number }>(res);
      if (!parsed.ok) throw new Error(parsed.error);
      setMessage(`Reseeded ${parsed.data.reseeded ?? 0} articles.`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Reseed failed");
    } finally {
      setSaving(false);
    }
  }

  function editRow(row: ArticleRow) {
    setForm({
      slug: row.slug,
      title: row.title,
      summary: row.summary,
      body: "",
      category: row.category,
      tags: row.tags.join(", "),
      audience: row.audience as typeof form.audience,
      published: row.published,
      sortOrder: row.sortOrder,
    });
    setMessage(`Editing "${row.slug}" — paste full body text before saving.`);
  }

  return (
    <section
      id="knowledge-base"
      className="rounded-xl border border-emerald-500/25 bg-[var(--card)] p-5 space-y-4"
    >
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-400/90">Platform assist</p>
        <h2 className="mt-1 text-lg font-semibold text-white">Knowledge base &amp; copilot</h2>
        <p className="mt-2 max-w-3xl text-sm text-slate-400">
          Articles power in-app search and the zero-API-cost copilot (no OpenAI). Extend with new slugs; seed
          content covers tuition, admin, and URAPearls.
        </p>
      </div>

      {error ? <p className="text-sm text-rose-400">{error}</p> : null}
      {message ? <p className="text-sm text-emerald-300">{message}</p> : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void reseed()}
          disabled={saving}
          className="rounded-lg border border-emerald-500/40 bg-emerald-950/40 px-3 py-2 text-xs font-semibold text-emerald-100 hover:bg-emerald-900/50 disabled:opacity-50"
        >
          Re-import seed + Learn
        </button>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="rounded-lg border border-slate-600 px-3 py-2 text-xs text-slate-300 hover:bg-slate-800/50"
        >
          Refresh
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="block text-xs text-slate-400">
          Slug (a-z, 0-9, hyphen)
          <input
            value={form.slug}
            onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
            className="mt-1 w-full rounded-lg border border-[var(--border)] bg-slate-950/50 px-3 py-2 text-sm text-white"
            placeholder="my-article-slug"
          />
        </label>
        <label className="block text-xs text-slate-400">
          Title
          <input
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            className="mt-1 w-full rounded-lg border border-[var(--border)] bg-slate-950/50 px-3 py-2 text-sm text-white"
          />
        </label>
        <label className="block text-xs text-slate-400 md:col-span-2">
          Summary
          <input
            value={form.summary}
            onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))}
            className="mt-1 w-full rounded-lg border border-[var(--border)] bg-slate-950/50 px-3 py-2 text-sm text-white"
          />
        </label>
        <label className="block text-xs text-slate-400 md:col-span-2">
          Body (markdown/plain)
          <textarea
            value={form.body}
            onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
            rows={6}
            className="mt-1 w-full rounded-lg border border-[var(--border)] bg-slate-950/50 px-3 py-2 text-sm text-white font-mono text-[13px]"
            placeholder="Full article text used by copilot search…"
          />
        </label>
        <label className="block text-xs text-slate-400">
          Category
          <input
            value={form.category}
            onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
            className="mt-1 w-full rounded-lg border border-[var(--border)] bg-slate-950/50 px-3 py-2 text-sm text-white"
          />
        </label>
        <label className="block text-xs text-slate-400">
          Audience
          <select
            value={form.audience}
            onChange={(e) =>
              setForm((f) => ({ ...f, audience: e.target.value as typeof form.audience }))
            }
            className="mt-1 w-full rounded-lg border border-[var(--border)] bg-slate-950/50 px-3 py-2 text-sm text-white"
          >
            <option value="all">All hubs</option>
            <option value="tuition">Tuition / pay</option>
            <option value="play">URAPearls / play</option>
            <option value="admin">School / master admin</option>
          </select>
        </label>
        <label className="block text-xs text-slate-400">
          Tags (comma-separated)
          <input
            value={form.tags}
            onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
            className="mt-1 w-full rounded-lg border border-[var(--border)] bg-slate-950/50 px-3 py-2 text-sm text-white"
          />
        </label>
        <label className="block text-xs text-slate-400">
          Sort order
          <input
            type="number"
            value={form.sortOrder}
            onChange={(e) => setForm((f) => ({ ...f, sortOrder: Number(e.target.value) || 0 }))}
            className="mt-1 w-full rounded-lg border border-[var(--border)] bg-slate-950/50 px-3 py-2 text-sm text-white"
          />
        </label>
      </div>

      <button
        type="button"
        onClick={() => void saveArticle()}
        disabled={saving || !form.slug || !form.title || !form.body}
        className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-500 disabled:opacity-50"
      >
        {saving ? "Saving…" : "Save article"}
      </button>

      <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
        <table className="min-w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-900/60 text-slate-500 uppercase tracking-wide">
            <tr>
              <th className="px-3 py-2">Slug</th>
              <th className="px-3 py-2">Title</th>
              <th className="px-3 py-2">Audience</th>
              <th className="px-3 py-2">Source</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-3 py-4 text-slate-500">
                  Loading…
                </td>
              </tr>
            ) : articles.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-4 text-slate-500">
                  No articles — save one or re-import seed.
                </td>
              </tr>
            ) : (
              articles.map((a) => (
                <tr key={a.id} className="border-t border-[var(--border)] hover:bg-slate-900/30">
                  <td className="px-3 py-2 font-mono text-emerald-200/90">{a.slug}</td>
                  <td className="px-3 py-2">{a.title}</td>
                  <td className="px-3 py-2">{a.audience}</td>
                  <td className="px-3 py-2 text-slate-500">{a.source}</td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => editRow(a)}
                      className="text-sky-300 hover:underline"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
