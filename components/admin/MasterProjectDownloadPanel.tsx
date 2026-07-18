"use client";

import { useState } from "react";
import Link from "next/link";
import {
  PROJECT_DOWNLOAD_CATALOGUE,
  PROJECT_DOWNLOAD_PART_META,
  type ProjectDownloadPart,
} from "@/lib/master-download-catalogue";
import { fetchJson } from "@/utils/fetch-json";
import { readJsonResponse } from "@/utils/read-json-response";

async function triggerDownload(part: string) {
  const r = await fetchJson(`/api/master/project-download?part=${encodeURIComponent(part)}`, {
    credentials: "include",
  });
  if (!r.ok) {
    const parsed = await readJsonResponse<{ error?: string }>(r);
    throw new Error(parsed.ok ? `Download failed (${r.status})` : parsed.error);
  }
  const blob = await r.blob();
  const dispo = r.headers.get("Content-Disposition") ?? "";
  const match = /filename="([^"]+)"/.exec(dispo);
  const filename = match?.[1] ?? `odelhub-${part}-${Date.now()}`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function MasterProjectDownloadPanel() {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function download(part: string) {
    setBusy(part);
    setError(null);
    setMessage(null);
    try {
      await triggerDownload(part);
      const label = PROJECT_DOWNLOAD_PART_META[part as ProjectDownloadPart]?.label ?? part;
      setMessage(`Download started: ${label}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Download failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section
      id="project-download"
      className="rounded-xl border border-cyan-500/25 bg-cyan-950/10 p-5 shadow-[0_0_0_1px_rgba(34,211,238,0.06)]"
    >
      <h2 className="text-sm font-semibold text-cyan-100">Project downloadables — organised catalogue</h2>
      <p className="mt-2 max-w-3xl text-xs leading-relaxed text-slate-400">
        Fully categorised downloads for this whole project: documentation, live data, access &amp; credentials
        (including Demo Schools / Universities logins), environment, and source. Use a category ZIP or download
        individual parts. Secrets in env / demo sheets are real — store securely. Related:{" "}
        <Link href="/admin/master#demo-logins" className="text-cyan-300 hover:underline">
          Demo logins
        </Link>
        ,{" "}
        <Link href="/admin/master#system-backup" className="text-cyan-300 hover:underline">
          System backup
        </Link>
        ,{" "}
        <Link href="/admin/master#deployment-environment" className="text-cyan-300 hover:underline">
          Environment
        </Link>
        .
      </p>

      {error ? <p className="mt-3 text-sm text-rose-400">{error}</p> : null}
      {message ? <p className="mt-3 text-sm text-emerald-300">{message}</p> : null}

      <div className="mt-5 space-y-8">
        {PROJECT_DOWNLOAD_CATALOGUE.map((category) => (
          <div key={category.id} className="space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 pb-2">
              <div>
                <h3 className="text-sm font-semibold text-white">{category.title}</h3>
                <p className="mt-1 max-w-2xl text-[11px] leading-relaxed text-slate-500">
                  {category.description}
                </p>
              </div>
              {category.categoryZipPart ? (
                <button
                  type="button"
                  disabled={busy !== null}
                  onClick={() => void download(category.categoryZipPart!)}
                  className="rounded-lg border border-cyan-500/40 bg-cyan-950/40 px-3 py-2 text-xs font-semibold text-cyan-100 hover:border-cyan-400/60 disabled:opacity-50"
                >
                  {busy === category.categoryZipPart
                    ? "Preparing…"
                    : category.categoryZipLabel ?? "Download category"}
                </button>
              ) : null}
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {category.parts.map((partId) => {
                const part = PROJECT_DOWNLOAD_PART_META[partId];
                if (!part || part.hideInGrid) return null;
                return (
                  <div
                    key={part.id}
                    className={`rounded-lg border p-4 ${
                      part.highlight
                        ? "border-cyan-400/35 bg-cyan-950/25"
                        : "border-white/10 bg-black/20"
                    }`}
                  >
                    <p className="text-sm font-medium text-white">{part.label}</p>
                    <p className="mt-1 text-[11px] leading-relaxed text-slate-500">{part.description}</p>
                    <button
                      type="button"
                      disabled={busy !== null}
                      onClick={() => void download(part.id)}
                      className={`mt-3 rounded-lg px-3 py-2 text-xs font-semibold disabled:opacity-50 ${
                        part.highlight
                          ? "bg-cyan-600 text-white hover:bg-cyan-500"
                          : "border border-white/15 text-slate-200 hover:bg-white/5"
                      }`}
                    >
                      {busy === part.id ? "Preparing…" : "Download"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
