"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

type SearchJson = {
  organizations?: { id: string; name: string; slug: string; tenantStatus: string }[];
  students?: { id: string; name: string; programmeCode: string; orgSlug: string }[];
  payments?: { id: string; status: string; studentName: string; orgSlug: string }[];
  error?: string;
};

export function AdminGlobalSearch() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const orgSlug = searchParams.get("orgSlug")?.trim() ?? "";
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<SearchJson | null>(null);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const hidden =
    pathname === "/admin/login" ||
    pathname === "/admin/register" ||
    !pathname.startsWith("/admin");

  const run = useCallback(async (query: string) => {
    if (query.trim().length < 2) {
      setData(null);
      return;
    }
    setLoading(true);
    try {
      const sp = new URLSearchParams();
      sp.set("q", query.trim());
      if (orgSlug) sp.set("orgSlug", orgSlug);
      const r = await fetch(`/api/admin/search?${sp.toString()}`, { credentials: "include" });
      const j = (await r.json()) as SearchJson;
      if (!r.ok) {
        setData({ error: j.error ?? "Search failed" });
        return;
      }
      setData(j);
    } finally {
      setLoading(false);
    }
  }, [orgSlug]);

  useEffect(() => {
    const t = setTimeout(() => {
      void run(q);
    }, 320);
    return () => clearTimeout(t);
  }, [q, run]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  if (hidden) return null;

  const orgQ = (slug: string) => (slug ? `?orgSlug=${encodeURIComponent(slug)}` : "");

  return (
    <div ref={wrapRef} className="relative w-full max-w-xl">
      <label htmlFor="global-admin-search" className="sr-only">
        Search workspaces, students, payments
      </label>
      <input
        id="global-admin-search"
        type="search"
        value={q}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        placeholder="Search students, payments, workspaces…"
        autoComplete="off"
        className="w-full rounded-md border border-[var(--border)] bg-black/30 px-3 py-2 text-sm text-white placeholder:text-slate-500"
      />
      {open && (q.trim().length >= 2 || data?.error) && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-[70vh] overflow-auto rounded-md border border-[var(--border)] bg-[#0d1526] p-3 text-sm shadow-xl">
          {loading && <p className="text-slate-500">Searching…</p>}
          {!loading && data?.error && <p className="text-rose-400">{data.error}</p>}
          {!loading && data && !data.error && (
            <div className="space-y-4">
              {data.organizations && data.organizations.length > 0 && (
                <section>
                  <p className="text-xs font-semibold uppercase text-slate-500">Workspaces</p>
                  <ul className="mt-1 space-y-1">
                    {data.organizations.map((o) => (
                      <li key={o.id}>
                        <Link
                          href={`/admin?orgSlug=${encodeURIComponent(o.slug)}`}
                          className="block rounded px-2 py-1 hover:bg-white/5"
                          onClick={() => setOpen(false)}
                        >
                          <span className="text-slate-200">{o.name}</span>
                          <span className="ml-2 font-mono text-xs text-slate-500">{o.slug}</span>
                          <span className="ml-2 text-xs text-amber-400/90">{o.tenantStatus}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
              {data.students && data.students.length > 0 && (
                <section>
                  <p className="text-xs font-semibold uppercase text-slate-500">Students</p>
                  <ul className="mt-1 space-y-1">
                    {data.students.map((s) => (
                      <li key={s.id}>
                        <Link
                          href={`/admin/students/${s.id}${orgQ(s.orgSlug)}`}
                          className="block rounded px-2 py-1 hover:bg-white/5"
                          onClick={() => setOpen(false)}
                        >
                          <span className="text-slate-200">{s.name}</span>
                          <span className="ml-2 text-xs text-slate-500">
                            {s.programmeCode} · {s.orgSlug}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
              {data.payments && data.payments.length > 0 && (
                <section>
                  <p className="text-xs font-semibold uppercase text-slate-500">Payments</p>
                  <ul className="mt-1 space-y-1">
                    {data.payments.map((p) => (
                      <li key={p.id}>
                        <Link
                          href={`/admin/payments${orgQ(p.orgSlug)}`}
                          className="block rounded px-2 py-1 font-mono text-xs hover:bg-white/5"
                          onClick={() => setOpen(false)}
                        >
                          {p.id.slice(-8)}… · {p.studentName} · {p.status} · {p.orgSlug}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
              {!loading &&
                data.organizations?.length === 0 &&
                data.students?.length === 0 &&
                data.payments?.length === 0 && <p className="text-slate-500">No matches.</p>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
