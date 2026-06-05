"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { PUBLIC_SCHOOL_LOGIN_PATH } from "@/lib/admin-auth-entry";

type StatusJson = {
  found: boolean;
  name?: string;
  slug?: string;
  tenantStatus?: string;
  emailVerified?: boolean;
  payUrl?: string;
  nextSteps?: string;
  error?: string;
};

function WorkspaceStatusInner() {
  const searchParams = useSearchParams();
  const slug = searchParams.get("slug")?.trim().toLowerCase() ?? "";
  const email = searchParams.get("email")?.trim().toLowerCase() ?? "";
  const [data, setData] = useState<StatusJson | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug && !email) {
      setLoading(false);
      setData({ found: false });
      return;
    }
    const sp = new URLSearchParams();
    if (slug) sp.set("slug", slug);
    if (email) sp.set("email", email);
    void (async () => {
      setLoading(true);
      const r = await fetch(`/api/public/workspace-status?${sp.toString()}`);
      const j = (await r.json()) as StatusJson;
      if (!r.ok) setData({ found: false, error: j.error ?? "Could not load status" });
      else setData(j);
      setLoading(false);
    })();
  }, [slug, email]);

  return (
    <main className="mx-auto max-w-lg px-4 py-12 text-slate-200">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-400/90">ODEL HUB</p>
      <h1 className="mt-2 text-2xl font-semibold text-white">Workspace status</h1>

      {loading ? <p className="mt-6 text-sm text-slate-500">Loading…</p> : null}
      {!loading && data?.error ? <p className="mt-6 text-sm text-rose-400">{data.error}</p> : null}
      {!loading && data && !data.found ? (
        <p className="mt-6 text-sm text-slate-400">
          No workspace found for that slug or email. Check your registration confirmation or{" "}
          <Link href="/admin/register" className="text-cyan-300 hover:underline">
            register again
          </Link>
          .
        </p>
      ) : null}
      {!loading && data?.found ? (
        <div className="mt-6 space-y-4 rounded-xl border border-white/10 bg-[#0a101f] p-5 text-sm">
          <p>
            <span className="text-slate-500">School</span>
            <br />
            <span className="font-medium text-white">{data.name}</span>
            <span className="ml-2 font-mono text-xs text-slate-500">({data.slug})</span>
          </p>
          <p>
            <span className="text-slate-500">Status</span>
            <br />
            <span className="capitalize text-amber-200/90">{data.tenantStatus}</span>
            {data.emailVerified ? (
              <span className="ml-2 text-xs text-emerald-400/90">· email verified</span>
            ) : (
              <span className="ml-2 text-xs text-slate-500">· email not verified</span>
            )}
          </p>
          {data.nextSteps ? (
            <p className="text-slate-300 leading-relaxed">{data.nextSteps}</p>
          ) : null}
          {data.payUrl && data.tenantStatus === "active" ? (
            <p>
              <Link href={data.payUrl} className="text-cyan-300 hover:underline">
                Open guest pay page
              </Link>
            </p>
          ) : null}
        </div>
      ) : null}

      <p className="mt-8 text-sm text-slate-500">
        <Link href={PUBLIC_SCHOOL_LOGIN_PATH} className="text-cyan-300/90 hover:underline">
          School admin sign-in
        </Link>
        {" · "}
        <Link href="/admin/register" className="text-slate-400 hover:text-white">
          Register a workspace
        </Link>
      </p>
    </main>
  );
}

export default function SchoolWorkspaceStatusPage() {
  return (
    <Suspense fallback={<p className="p-8 text-slate-500">Loading…</p>}>
      <WorkspaceStatusInner />
    </Suspense>
  );
}
