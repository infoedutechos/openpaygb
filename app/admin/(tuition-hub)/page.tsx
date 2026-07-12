"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthMe } from "@/hooks/useAuthMe";
import { clientFetchErrorMessage } from "@/lib/client-fetch-error";
import { TenantList } from "@/components/tuition/TenantList";
import { AdminUserProfileSection } from "@/components/profile/AdminUserProfileSection";

type Summary = {
  viewer?: {
    role: string;
    organizationName: string | null;
    organizationSlug: string | null;
  };
  totalCollectionsTon: number;
  totalCollectionsUgx?: number;
  collectionsByRail?: { rail: string; count: number; totalUgx: number; tonAmount: number }[];
  totalPayments: number;
  totalStudents: number;
  monthlyPending: { m: string; count: number }[];
  collectionsMomPct: number | null;
  paymentsMomPct: number | null;
  studentsMomPct: number | null;
  recentPayments: {
    id: string;
    studentId: string;
    studentName: string;
    tonAmount: number;
    totalUgx?: number;
    status: string;
    createdAt: string;
  }[];
  pendingPayments: {
    id: string;
    studentId: string;
    studentName: string;
    tonAmount: number;
    totalUgx: number;
    status: string;
    createdAt: string;
  }[];
};

const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

function shortMonthLabel(monthKey: string): string {
  const parts = monthKey.split("-");
  const mo = parseInt(parts[1] ?? "", 10);
  if (mo >= 1 && mo <= 12) return MONTH_SHORT[mo - 1];
  return monthKey;
}

function formatMom(p: number | null): string {
  if (p === null) return "—";
  const sign = p > 0 ? "+" : "";
  return `${sign}${p}% this month`;
}

function PendingPaymentsChart({ rows }: { rows: { m: string; count: number }[] }) {
  if (rows.length === 0) {
    return <p className="mt-6 text-sm text-slate-500">No pending payments in this period.</p>;
  }
  const w = 560;
  const h = 180;
  const padX = 32;
  const padY = 28;
  const max = Math.max(...rows.map((r) => r.count), 1);
  const pts = rows.map((r, i) => {
    const x = padX + (i / Math.max(rows.length - 1, 1)) * (w - padX * 2);
    const y = h - padY - (r.count / max) * (h - padY * 2);
    return { x, y, m: r.m };
  });
  const d = `M ${pts.map((p) => `${p.x},${p.y}`).join(" L ")}`;

  return (
    <div className="mt-4">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="pendingFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgb(59 130 246)" stopOpacity="0.2" />
            <stop offset="100%" stopColor="rgb(59 130 246)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          d={`${d} L ${w - padX},${h - padY} L ${padX},${h - padY} Z`}
          fill="url(#pendingFill)"
        />
        <path d={d} fill="none" stroke="rgb(59 130 246)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {pts.map((p) => (
          <circle key={p.m} cx={p.x} cy={p.y} r="4" fill="rgb(59 130 246)" />
        ))}
      </svg>
      <div className="mt-2 flex justify-between px-2 text-xs text-slate-500">
        {rows.map((r) => (
          <span key={r.m}>{shortMonthLabel(r.m)}</span>
        ))}
      </div>
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#0d1526]/80 p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
      <p className="mt-1 text-xs font-medium text-emerald-400/90">{sub}</p>
    </div>
  );
}

function AdminDashboardPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orgSlugFilter = searchParams.get("orgSlug")?.trim().toLowerCase() ?? "";
  const { data: authMe, loading: authLoading } = useAuthMe();
  const isSchoolTenant = authMe?.admin?.organization?.institutionTier === "school";
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || !authMe?.tuitionSession) return;
    if (isSchoolTenant && !orgSlugFilter) {
      router.replace("/admin/school-dashboard");
    }
  }, [authLoading, authMe?.tuitionSession, isSchoolTenant, orgSlugFilter, router]);

  useEffect(() => {
    if (isSchoolTenant && !orgSlugFilter) return;
    if (authLoading) return;
    if (!authMe) {
      setError("Sign in to view the tuition hub dashboard.");
      return;
    }
    if (!authMe.tuitionSession) {
      setError(
        authMe.adminShellAccess
          ? "Sign in with your tuition hub admin account (email and password) to view the dashboard."
          : "Unauthorized",
      );
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const q = orgSlugFilter ? `?organizationSlug=${encodeURIComponent(orgSlugFilter)}` : "";
        const r = await fetch(`/api/admin/summary${q}`, { credentials: "include" });
        const j = await r.json();
        if (!r.ok) {
          if (!cancelled) setError(j.error ?? "Could not load summary");
          return;
        }
        if (!cancelled) setSummary(j as Summary);
      } catch (err) {
        if (!cancelled) setError(clientFetchErrorMessage(err));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authLoading, authMe, orgSlugFilter, isSchoolTenant]);

  if (isSchoolTenant && !orgSlugFilter) {
    return <p className="text-sm text-slate-500">Opening school dashboard…</p>;
  }

  if (error) {
    return <p className="text-sm text-rose-600">{error}</p>;
  }
  if (authLoading || !summary) {
    return <p className="text-sm text-slate-500">Loading dashboard…</p>;
  }

  const schoolName =
    summary.viewer?.organizationName?.trim() ||
    authMe?.admin?.organization?.name?.trim() ||
    null;
  const isSchoolAdmin = authMe?.admin?.role === "org_admin";
  const scopedSlug =
    (summary.viewer as { scopedToSlug?: string | null } | undefined)?.scopedToSlug ?? orgSlugFilter;

  return (
    <div className="space-y-6">
      <AdminUserProfileSection />

      {scopedSlug ? (
        <p className="rounded-lg border border-amber-500/30 bg-amber-950/25 px-4 py-2 text-sm text-amber-100/95">
          Viewing dashboard for <strong className="font-mono">{scopedSlug}</strong>.{" "}
          <Link href="/admin" className="text-cyan-300 underline hover:text-cyan-200">
            Clear filter
          </Link>
        </p>
      ) : null}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-white">
            {isSchoolAdmin && schoolName ? schoolName : "Dashboard"}
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            {isSchoolAdmin && schoolName
              ? "School dashboard"
              : schoolName
                ? schoolName
                : isSchoolAdmin
                  ? "Link your admin account to a school workspace to show the school name here."
                  : "Platform overview"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/payment-requests"
            className="rounded-lg border border-cyan-500/30 bg-cyan-950/30 px-3 py-2 text-xs font-medium text-cyan-200 hover:border-cyan-400/50"
          >
            Payment requests
          </Link>
          <Link
            href="/admin/settings"
            className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-white/10"
          >
            Settings
          </Link>
        </div>
      </div>

      {summary.viewer?.role === "master" ? (
        <TenantList
          title="Schools (tenants)"
          description="Open pay checkout or review data per school."
          className="rounded-xl border border-white/10 bg-[#0a101f]/50 p-4"
        />
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          label="Total Collections"
          value={`${summary.totalCollectionsTon.toLocaleString()} TON`}
          sub={formatMom(summary.collectionsMomPct)}
        />
        <StatCard
          label="Confirmed (UGX)"
          value={`UGX ${(summary.totalCollectionsUgx ?? 0).toLocaleString()}`}
          sub="All confirmed payments"
        />
        <StatCard label="Total Students" value={String(summary.totalStudents)} sub={formatMom(summary.studentsMomPct)} />
      </div>

      {summary.collectionsByRail && summary.collectionsByRail.length > 0 ? (
        <section className="rounded-xl border border-white/10 bg-[#0d1526]/80 p-5">
          <h2 className="text-base font-semibold text-white">Collections by rail</h2>
          <ul className="mt-3 divide-y divide-white/10 text-sm">
            {summary.collectionsByRail.map((r) => (
              <li key={r.rail} className="flex justify-between gap-4 py-2">
                <span className="font-medium capitalize text-slate-200">{r.rail.replace(/_/g, " ")}</span>
                <span className="text-slate-400">
                  {r.count} · UGX {r.totalUgx.toLocaleString()} · {r.tonAmount} TON
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="rounded-xl border border-white/10 bg-[#0d1526]/80 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-white">Pending Payments</h2>
          <Link
            href="/admin/payments?status=pending"
            className="text-xs font-medium text-cyan-300 hover:underline"
          >
            View all pending
          </Link>
        </div>
        <ul className="mt-4 divide-y divide-white/10">
          {(summary.pendingPayments ?? []).length === 0 ? (
            <li className="py-4 text-sm text-slate-500">No pending payments right now.</li>
          ) : (
            summary.pendingPayments.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                <Link
                  href={`/admin/students/${p.studentId}`}
                  className="min-w-0 font-medium text-cyan-300 hover:underline"
                >
                  {p.studentName}
                </Link>
                <span className="font-mono text-slate-300">
                  {p.tonAmount > 0 ? `${p.tonAmount.toFixed(2)} TON` : `UGX ${p.totalUgx.toLocaleString()}`}
                </span>
                <Link
                  href={`/admin/payments?highlight=${p.id}`}
                  className="shrink-0 text-xs font-medium text-amber-300/90 hover:underline"
                >
                  Pending · {new Date(p.createdAt).toLocaleDateString(undefined, { day: "numeric", month: "short" })}
                </Link>
              </li>
            ))
          )}
        </ul>
        {(summary.monthlyPending ?? []).length > 0 ? (
          <div className="mt-6 border-t border-white/10 pt-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Pending trend (7 months)</p>
            <PendingPaymentsChart rows={summary.monthlyPending ?? []} />
          </div>
        ) : null}
      </section>

      <section className="rounded-xl border border-white/10 bg-[#0d1526]/80 p-5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-white">Recent Payments</h2>
          <Link href="/admin/payments" className="text-xs font-medium text-cyan-300 hover:underline">
            View all
          </Link>
        </div>
        <ul className="mt-4 divide-y divide-white/10">
          {summary.recentPayments.length === 0 ? (
            <li className="py-4 text-sm text-slate-500">No payments yet.</li>
          ) : (
            summary.recentPayments.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-4 py-3 text-sm">
                <Link
                  href={`/admin/students/${p.studentId}`}
                  className="font-medium text-cyan-300 hover:underline"
                >
                  {p.studentName}
                </Link>
                <span className="font-mono text-slate-300">{p.tonAmount.toFixed(2)} TON</span>
                <span className="shrink-0 text-slate-500">
                  {new Date(p.createdAt).toLocaleDateString(undefined, {
                    day: "numeric",
                    month: "short",
                  })}
                </span>
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}

export default function AdminDashboardPage() {
  return (
    <Suspense fallback={<p className="text-sm text-slate-500">Loading dashboard…</p>}>
      <AdminDashboardPageInner />
    </Suspense>
  );
}
