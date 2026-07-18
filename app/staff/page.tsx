"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type StaffMe = {
  staff: {
    id: string;
    name: string;
    staffCode: string;
    duty: string;
    salaryUgx: number;
    status: string;
    organizationName: string;
    institutionTier: string;
    previousLoginAt: string | null;
    salaryPayments: { id: string; monthKey: string; netUgx: number; paidAt: string | null }[];
  };
};

export default function StaffDashboardPage() {
  const [data, setData] = useState<StaffMe | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const r = await fetch("/api/staff/me", { credentials: "include" });
      if (!r.ok) {
        setError("Could not load staff dashboard");
        return;
      }
      setData((await r.json()) as StaffMe);
    })();
  }, []);

  if (error) return <p className="text-sm text-rose-400">{error}</p>;
  if (!data) return <p className="text-sm text-slate-400">Loading…</p>;

  const s = data.staff;
  const recent = s.salaryPayments.slice(0, 3);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Welcome, {s.name}</h1>
        <p className="mt-1 text-sm text-slate-400">
          {s.organizationName} · Staff ID{" "}
          <span className="font-mono text-amber-200/90">{s.staffCode}</span>
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-[#0a101f] p-5">
          <p className="text-xs uppercase tracking-wide text-slate-500">Duty</p>
          <p className="mt-1 text-lg text-white">{s.duty || "—"}</p>
          <p className="mt-2 text-xs text-slate-500">Status: {s.status}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-[#0a101f] p-5">
          <p className="text-xs uppercase tracking-wide text-slate-500">Contract salary</p>
          <p className="mt-1 text-lg tabular-nums text-emerald-300">
            UGX {s.salaryUgx.toLocaleString()}
          </p>
        </div>
      </div>
      <div className="rounded-2xl border border-white/10 bg-[#0a101f] p-5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-white">Recent salary payments</h2>
          <Link href="/staff/salary" className="text-xs text-cyan-400 hover:underline">
            View all
          </Link>
        </div>
        {recent.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">No salary payments recorded yet.</p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm">
            {recent.map((p) => (
              <li key={p.id} className="flex justify-between gap-3 text-slate-300">
                <span>{p.monthKey}</span>
                <span className="tabular-nums text-emerald-300/90">UGX {p.netUgx.toLocaleString()}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="flex flex-wrap gap-3 text-sm">
        <Link href="/staff/profile" className="rounded-lg border border-white/15 px-4 py-2 text-slate-200 hover:bg-white/5">
          My profile
        </Link>
        <Link href="/staff/salary" className="rounded-lg bg-amber-800/80 px-4 py-2 font-semibold text-white">
          Salary history
        </Link>
      </div>
    </div>
  );
}
