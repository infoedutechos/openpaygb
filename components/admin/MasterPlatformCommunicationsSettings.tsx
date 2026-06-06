"use client";

import { useCallback, useEffect, useState } from "react";
import { DashboardChatNavButton } from "@/components/nav/DashboardChatNavButton";
import { fetchJson } from "@/utils/fetch-json";
import { readJsonResponse } from "@/utils/read-json-response";

type NotificationRow = {
  id: string;
  title: string;
  body: string;
  imageUrl: string | null;
  videoUrl: string | null;
  href: string | null;
  audience: string;
  isActive: boolean;
  createdAt: string;
};

const AUDIENCES = ["all", "tuition", "play", "admin"] as const;

export function MasterPlatformCommunicationsSettings() {
  const [rows, setRows] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [href, setHref] = useState("");
  const [audience, setAudience] = useState<(typeof AUDIENCES)[number]>("all");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetchJson("/api/master/notifications", { credentials: "include" });
      const parsed = await readJsonResponse<{ notifications: NotificationRow[] }>(r);
      if (!parsed.ok) throw new Error(parsed.error);
      setRows(parsed.data.notifications ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load notifications");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function createNotification(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const r = await fetch("/api/master/notifications", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          body: body.trim(),
          href: href.trim() || null,
          audience,
          isActive: true,
        }),
      });
      const parsed = await readJsonResponse(r);
      if (!parsed.ok) throw new Error(parsed.error);
      setTitle("");
      setBody("");
      setHref("");
      setMessage("Notification published to the platform bell.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Create failed");
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(row: NotificationRow) {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch(`/api/master/notifications/${row.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !row.isActive }),
      });
      const parsed = await readJsonResponse(r);
      if (!parsed.ok) throw new Error(parsed.error);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusy(false);
    }
  }

  async function remove(row: NotificationRow) {
    if (!window.confirm(`Delete “${row.title}”?`)) return;
    setBusy(true);
    setError(null);
    try {
      const r = await fetch(`/api/master/notifications/${row.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const parsed = await readJsonResponse(r);
      if (!parsed.ok) throw new Error(parsed.error);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      id="platform-communications"
      className="rounded-xl border border-sky-500/25 bg-sky-950/10 p-5 space-y-6"
    >
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-sky-400/90">
          Chat & notifications
        </p>
        <h2 className="mt-2 text-lg font-semibold text-white">Platform communications</h2>
        <p className="mt-2 max-w-3xl text-sm text-slate-400">
          Manage in-app notifications shown in the bell on tuition, play, and admin dashboards. Chat answers come from
          the knowledge base — edit articles in the section below.
        </p>
        <div className="mt-4 max-w-xs">
          <DashboardChatNavButton variant="master" />
        </div>
      </div>

      {error ? <p className="text-sm text-rose-400">{error}</p> : null}
      {message ? <p className="text-sm text-emerald-300">{message}</p> : null}

      <form onSubmit={(e) => void createNotification(e)} className="grid gap-3 rounded-lg border border-white/10 bg-black/20 p-4 md:grid-cols-2">
        <label className="block text-sm md:col-span-2">
          <span className="text-slate-400">Title</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-white"
            required
          />
        </label>
        <label className="block text-sm md:col-span-2">
          <span className="text-slate-400">Message</span>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-white"
          />
        </label>
        <label className="block text-sm">
          <span className="text-slate-400">Audience</span>
          <select
            value={audience}
            onChange={(e) => setAudience(e.target.value as (typeof AUDIENCES)[number])}
            className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-white"
          >
            {AUDIENCES.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="text-slate-400">Link (optional)</span>
          <input
            value={href}
            onChange={(e) => setHref(e.target.value)}
            placeholder="/pay/example"
            className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-white"
          />
        </label>
        <div className="md:col-span-2">
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500 disabled:opacity-50"
          >
            Publish notification
          </button>
        </div>
      </form>

      <div className="overflow-x-auto rounded-lg border border-white/10">
        <table className="min-w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-900/60 text-slate-500 uppercase tracking-wide">
            <tr>
              <th className="px-3 py-2">Title</th>
              <th className="px-3 py-2">Audience</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Created</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-3 py-4 text-slate-500">
                  Loading…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-4 text-slate-500">
                  No notifications yet.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-t border-white/10">
                  <td className="px-3 py-2">
                    <p className="font-medium text-white">{row.title}</p>
                    <p className="text-slate-500 line-clamp-2">{row.body}</p>
                  </td>
                  <td className="px-3 py-2">{row.audience}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                        row.isActive ? "bg-emerald-500/15 text-emerald-300" : "bg-slate-500/15 text-slate-400"
                      }`}
                    >
                      {row.isActive ? "active" : "hidden"}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-slate-500">
                    {new Date(row.createdAt).toLocaleString()}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void toggleActive(row)}
                        className="rounded border border-white/15 px-2 py-1 hover:bg-white/5 disabled:opacity-50"
                      >
                        {row.isActive ? "Hide" : "Show"}
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void remove(row)}
                        className="rounded border border-rose-500/30 px-2 py-1 text-rose-300 hover:bg-rose-950/30 disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </div>
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
