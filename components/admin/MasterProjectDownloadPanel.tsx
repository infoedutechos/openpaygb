"use client";

import { useState } from "react";
import { fetchJson } from "@/utils/fetch-json";
import { readJsonResponse } from "@/utils/read-json-response";

type Part = {
  id: string;
  label: string;
  description: string;
  highlight?: boolean;
};

const PARTS: Part[] = [
  {
    id: "full",
    label: "Whole project",
    description: "ZIP: tuition data, env, KB, notifications, full docs library, and source when available.",
    highlight: true,
  },
  {
    id: "documentation",
    label: "Full documentation (ZIP)",
    description: "All docs/ markdown: project description, user guides, flows, deployment, runbooks.",
    highlight: true,
  },
  {
    id: "project-description",
    label: "Project description",
    description: "Complete product & technical specification (PROJECT_DESCRIPTION.md).",
    highlight: true,
  },
  {
    id: "user-guides",
    label: "User guides (ZIP)",
    description: "Master, school admin, student, guest payer, and partner integrator guides.",
    highlight: true,
  },
  { id: "tuition", label: "Tuition data (full)", description: "All tuition collections JSON (same as System backup)." },
  { id: "organizations", label: "Organizations only", description: "Schools + platform UI settings." },
  { id: "programmes", label: "Programmes & fees", description: "Organizations, programmes, fee rows." },
  { id: "payments", label: "Students & payments", description: "Organizations, students, payment records." },
  {
    id: "master-admins",
    label: "Master Admin Download",
    description: "Platform master and school org_admin accounts (emails, roles, schools — no password hashes).",
    highlight: true,
  },
  { id: "env", label: "Environment variables", description: "Merged .env for Vercel import." },
  { id: "knowledge-base", label: "Knowledge base", description: "Help articles JSON export." },
  { id: "notifications", label: "Notifications", description: "Platform notification history JSON." },
  { id: "source", label: "Source code", description: "Git archive or GitHub zip of the repository." },
];

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
      setMessage(`Download started: ${part}`);
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
      <h2 className="text-sm font-semibold text-cyan-100">Project download</h2>
      <p className="mt-2 max-w-3xl text-xs leading-relaxed text-slate-400">
        Download the <strong className="text-slate-300">whole project bundle</strong> (data + env + docs + source when
        available) or <strong className="text-slate-300">individual parts</strong>. Exports run on demand from Master
        Admin — no manual CLI required. Secrets in env export are real values; store downloads securely.
      </p>

      {error ? <p className="mt-3 text-sm text-rose-400">{error}</p> : null}
      {message ? <p className="mt-3 text-sm text-emerald-300">{message}</p> : null}

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {PARTS.map((part) => (
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
        ))}
      </div>
    </section>
  );
}
