"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { workspacePortalPath } from "@/lib/workspace-portal-url";

type OrgRow = {
  id: string;
  name: string;
  slug: string;
  tenantStatus: string;
  registrationContactEmail: string;
  registrationNote: string;
  createdAt: string;
};

function formatWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

export function MasterPendingSchoolsBanner() {
  const [pending, setPending] = useState<OrgRow[] | null>(null);
  const [open, setOpen] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await fetch("/api/master/organizations", { credentials: "include" });
    const j = await r.json();
    if (!r.ok) {
      setLoadError((j as { error?: string }).error ?? "Could not load requests");
      setPending([]);
      return;
    }
    const rows = ((j as { organizations?: OrgRow[] }).organizations ?? []).filter(
      (o) => o.tenantStatus === "pending",
    );
    setPending(rows);
    setLoadError(null);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (pending === null) {
    return (
      <div className="rounded-xl border border-white/10 bg-[var(--card)] px-4 py-3 text-sm text-slate-500">
        Loading school requests…
      </div>
    );
  }

  const count = pending.length;

  return (
    <>
      <div
        className={`rounded-xl border px-4 py-3 ${
          count > 0
            ? "border-amber-500/40 bg-gradient-to-r from-amber-950/50 to-[var(--card)] shadow-[0_0_0_1px_rgba(245,158,11,0.12)]"
            : "border-white/10 bg-[var(--card)]"
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p
              className={`text-xs font-bold uppercase tracking-[0.2em] ${
                count > 0 ? "text-amber-400/90" : "text-slate-500"
              }`}
            >
              {count > 0 ? "Action required" : "School requests"}
            </p>
            <p className="mt-1 text-sm text-slate-200">
              {loadError ? (
                loadError
              ) : count > 0 ? (
                <>
                  <strong className="font-semibold text-amber-100">{count}</strong> school workspace
                  {count === 1 ? "" : "s"} awaiting your approval.
                </>
              ) : (
                <>No pending school requests. Open the list to review past submissions.</>
              )}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-amber-500"
            >
              Review requests
            </button>
            <Link
              href="/admin/master/organizations"
              className="rounded-lg border border-amber-500/35 px-4 py-2 text-sm font-medium text-amber-100 hover:border-amber-400/55"
            >
              Manage organizations
            </Link>
          </div>
        </div>
      </div>

      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="pending-schools-title"
          className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-black/65 p-0 backdrop-blur-sm sm:items-start sm:p-4 sm:pt-[max(1rem,10vh)]"
          onClick={() => setOpen(false)}
        >
          <div
            className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-amber-500/30 bg-[#0d1526] shadow-2xl shadow-black/50 sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-white/10 px-5 py-4">
              <div>
                <h2 id="pending-schools-title" className="text-lg font-semibold text-white">
                  Requested schools
                </h2>
                <p className="mt-1 text-xs text-slate-400">
                  Self-service registrations from <span className="font-mono text-slate-500">/admin/register</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg px-2 py-1 text-slate-400 hover:bg-white/10 hover:text-white"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="max-h-[min(60vh,28rem)] overflow-y-auto px-5 py-4">
              {loadError ? <p className="text-sm text-rose-400">{loadError}</p> : null}
              {!loadError && pending.length === 0 ? (
                <p className="text-sm text-slate-400">No pending requests right now.</p>
              ) : null}
              <ul className="space-y-3">
                {pending.map((o) => (
                  <li
                    key={o.id}
                    className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm"
                  >
                    <p className="font-semibold text-white">{o.name}</p>
                    <p className="mt-1 font-mono text-xs text-cyan-200/80">/pay/{o.slug}</p>
                    {o.registrationContactEmail ? (
                      <p className="mt-2 text-xs text-slate-400">
                        Contact:{" "}
                        <a href={`mailto:${o.registrationContactEmail}`} className="text-cyan-300 hover:underline">
                          {o.registrationContactEmail}
                        </a>
                      </p>
                    ) : null}
                    {o.registrationNote ? (
                      <p className="mt-2 text-xs leading-relaxed text-slate-500">{o.registrationNote}</p>
                    ) : null}
                    <p className="mt-2 text-[10px] text-slate-600">Submitted {formatWhen(o.createdAt)}</p>
                    <Link
                      href={workspacePortalPath({ slug: o.slug, email: o.registrationContactEmail })}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-flex min-h-[40px] items-center rounded-lg border border-violet-500/35 px-3 py-2 text-xs font-semibold text-violet-200 hover:border-violet-400/55 hover:text-white"
                    >
                      Open applicant workspace portal
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-wrap justify-end gap-2 border-t border-white/10 px-5 py-4">
              <button
                type="button"
                onClick={() => void load()}
                className="rounded-lg border border-white/15 px-4 py-2 text-sm text-slate-300 hover:bg-white/5"
              >
                Refresh
              </button>
              <Link
                href="/admin/master/organizations"
                onClick={() => setOpen(false)}
                className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-amber-500"
              >
                Approve in organizations
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
