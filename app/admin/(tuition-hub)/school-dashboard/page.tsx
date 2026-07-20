"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { formatUgx } from "@/components/admin/school/SchoolContextBar";
import { SchoolPieChart } from "@/components/admin/school/SchoolPieChart";
import { useSchoolAdminApi } from "@/hooks/useSchoolAdminApi";

type Dashboard = {
  accounts: { expectedUgx: number; receivedUgx: number; outstandingUgx: number; recoveryPercent: number };
  cashflows: { incomeUgx: number; expenditureUgx: number; netUgx: number };
  defaulters: { responding: number; overdue: number; totalDue: number };
  students: { total: number; male: number; female: number };
  staff: { teaching: number; nonTeaching: number; total: number };
  inventory: { availableTypes: number; unavailableTypes: number; totalTypes: number };
};

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0a101f] p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">{title}</h2>
      <div className="mt-3 space-y-1 text-sm text-slate-200">{children}</div>
    </div>
  );
}

function SchoolDashboardInner() {
  const { schoolFetch, needsOrgSlug, hrefWithOrgSlug } = useSchoolAdminApi();
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (needsOrgSlug) return;
    void schoolFetch("/api/admin/school/dashboard").then(async (r) => {
      const j = await r.json();
      if (!r.ok) {
        setError(j.error ?? "Failed to load dashboard");
        return;
      }
      setDashboard(j.dashboard ?? null);
    });
  }, [needsOrgSlug, schoolFetch]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-white">School dashboard</h1>
          <p className="text-sm text-slate-400">Fees, cashflows, defaulters, staff, and inventory at a glance.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={hrefWithOrgSlug("/admin/my-card")}
            className="rounded-lg border border-violet-500/35 bg-violet-950/35 px-3 py-2 text-xs font-medium text-violet-100 hover:border-violet-400/50"
          >
            My OpenPayGB Card
          </Link>
          <Link
            href={hrefWithOrgSlug("/admin/virtual-cards")}
            className="rounded-lg border border-violet-500/25 bg-violet-950/20 px-3 py-2 text-xs font-medium text-violet-200/90 hover:border-violet-400/40"
          >
            OpenPayGB Cards
          </Link>
        </div>
      </div>
      {error ? <p className="text-sm text-rose-400">{error}</p> : null}
      {dashboard ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card title="Accounts">
            <SchoolPieChart
              slices={[
                { label: "Received", value: dashboard.accounts.receivedUgx, color: "#22c55e" },
                { label: "Outstanding", value: dashboard.accounts.outstandingUgx, color: "#f97316" },
              ]}
            />
            <p className="pt-2">
              Recovery: <strong>{dashboard.accounts.recoveryPercent}%</strong>
            </p>
            <p>Expected: {formatUgx(dashboard.accounts.expectedUgx)}</p>
            <p>Received: {formatUgx(dashboard.accounts.receivedUgx)}</p>
            <p>Outstanding: {formatUgx(dashboard.accounts.outstandingUgx)}</p>
          </Card>
          <Card title="Cashflows">
            <p>Income: {formatUgx(dashboard.cashflows.incomeUgx)}</p>
            <p>Expenditure: {formatUgx(dashboard.cashflows.expenditureUgx)}</p>
            <p>Net: {formatUgx(dashboard.cashflows.netUgx)}</p>
          </Card>
          <Card title="Defaulters">
            <p>Responding: {dashboard.defaulters.responding}</p>
            <p>Overdue: {dashboard.defaulters.overdue}</p>
            <p>Total due: {dashboard.defaulters.totalDue}</p>
          </Card>
          <Card title="Students">
            <p>Total: {dashboard.students.total}</p>
            <p>Male: {dashboard.students.male}</p>
            <p>Female: {dashboard.students.female}</p>
            {dashboard.students.total > 0 ? (
              <SchoolPieChart
                size={72}
                slices={[
                  { label: "Male", value: dashboard.students.male, color: "#0ea5e9" },
                  { label: "Female", value: dashboard.students.female, color: "#ec4899" },
                ]}
              />
            ) : null}
          </Card>
          <Card title="Staff">
            <p>Teaching: {dashboard.staff.teaching}</p>
            <p>Non-teaching: {dashboard.staff.nonTeaching}</p>
            <p>Total: {dashboard.staff.total}</p>
          </Card>
          <Card title="Inventory">
            <p>Available types: {dashboard.inventory.availableTypes}</p>
            <p>Unavailable types: {dashboard.inventory.unavailableTypes}</p>
            <p>Total item types: {dashboard.inventory.totalTypes}</p>
          </Card>
        </div>
      ) : (
        <p className="text-sm text-slate-500">Loading dashboard…</p>
      )}
    </div>
  );
}

export default function SchoolDashboardPage() {
  return (
    <Suspense fallback={<p className="text-sm text-slate-500">Loading dashboard…</p>}>
      <SchoolDashboardInner />
    </Suspense>
  );
}
