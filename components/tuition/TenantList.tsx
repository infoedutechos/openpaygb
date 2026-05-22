"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export type TenantRow = { id: string; name: string; slug: string };

type Props = {
  className?: string;
  title?: string;
  description?: string;
  /** Highlight the active tenant */
  currentSlug?: string;
  /** Card grid (pay hub) or compact link row */
  variant?: "grid" | "compact";
  /** Called when user picks a tenant (compact filter mode) */
  onPickSlug?: (slug: string) => void;
  /** Use buttons instead of pay links (admin filters) */
  filterMode?: boolean;
};

export function TenantList({
  className = "",
  title = "Schools (tenants)",
  description,
  currentSlug,
  variant = "grid",
  onPickSlug,
  filterMode = false,
}: Props) {
  const [orgs, setOrgs] = useState<TenantRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const r = await fetch("/api/public/organizations");
        const j = (await r.json()) as { organizations?: TenantRow[]; error?: string };
        if (!r.ok) throw new Error(j.error ?? "Could not load schools");
        if (!cancelled) {
          setOrgs(Array.isArray(j.organizations) ? j.organizations : []);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Could not load schools");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return <p className={`text-sm text-slate-400 ${className}`}>Loading schools…</p>;
  }
  if (error) {
    return <p className={`text-sm text-rose-400 ${className}`}>{error}</p>;
  }
  if (orgs.length === 0) {
    return (
      <p className={`text-sm text-amber-200/90 ${className}`}>
        No active schools are listed yet. Run <code className="font-mono text-amber-100">npm run seed</code> after{" "}
        <code className="font-mono text-amber-100">npm run db:push</code>.
      </p>
    );
  }

  const normalizedCurrent = currentSlug?.trim().toLowerCase();

  if (variant === "compact") {
    return (
      <section className={`space-y-2 ${className}`}>
        {title ? <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</p> : null}
        {description ? <p className="text-xs text-slate-500">{description}</p> : null}
        <div className="flex flex-wrap gap-2">
          {orgs.map((o) => {
            const active = normalizedCurrent === o.slug;
            const inner = (
              <>
                <span className="font-medium">{o.name}</span>
                <span className="font-mono text-[10px] opacity-80"> ({o.slug})</span>
              </>
            );
            if (filterMode && onPickSlug) {
              return (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => onPickSlug(o.slug)}
                  className={`rounded-lg border px-3 py-1.5 text-xs transition ${
                    active
                      ? "border-cyan-400/50 bg-cyan-500/15 text-cyan-50"
                      : "border-white/15 bg-white/5 text-slate-200 hover:border-cyan-400/35"
                  }`}
                >
                  {inner}
                </button>
              );
            }
            return (
              <Link
                key={o.id}
                href={`/pay/${encodeURIComponent(o.slug)}`}
                className={`rounded-lg border px-3 py-1.5 text-xs transition ${
                  active
                    ? "border-cyan-400/50 bg-cyan-500/15 text-cyan-50"
                    : "border-white/15 bg-white/5 text-slate-200 hover:border-cyan-400/35"
                }`}
              >
                {inner}
              </Link>
            );
          })}
        </div>
      </section>
    );
  }

  return (
    <section className={`space-y-3 ${className}`}>
      <div>
        <h2 className="text-sm font-semibold text-slate-200">{title}</h2>
        {description ? <p className="mt-1 text-xs text-slate-400">{description}</p> : null}
      </div>
      <ul className="grid gap-2 sm:grid-cols-2">
        {orgs.map((o) => {
          const active = normalizedCurrent === o.slug;
          const cardClass = `block rounded-xl border px-4 py-3 text-left transition ${
            active
              ? "border-cyan-400/45 bg-cyan-500/10 ring-1 ring-cyan-400/30"
              : "border-[var(--border)] bg-[var(--card)] hover:border-cyan-400/35"
          }`;
          const content = (
            <>
              <p className="text-sm font-medium text-white">{o.name}</p>
              <p className="mt-0.5 font-mono text-xs text-slate-400">{o.slug}</p>
              {active ? (
                <p className="mt-1 text-[10px] font-medium uppercase tracking-wider text-cyan-300/90">Current</p>
              ) : null}
            </>
          );
          if (filterMode && onPickSlug) {
            return (
              <li key={o.id}>
                <button type="button" onClick={() => onPickSlug(o.slug)} className={`w-full ${cardClass}`}>
                  {content}
                </button>
              </li>
            );
          }
          return (
            <li key={o.id}>
              <Link href={`/pay/${encodeURIComponent(o.slug)}`} className={cardClass}>
                {content}
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
