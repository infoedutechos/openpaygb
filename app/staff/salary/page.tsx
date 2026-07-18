"use client";

import { useEffect, useState } from "react";

type Pay = {
  id: string;
  monthKey: string;
  grossUgx: number;
  deductionUgx: number;
  netUgx: number;
  paidAt: string | null;
};

export default function StaffSalaryPage() {
  const [rows, setRows] = useState<Pay[]>([]);
  const [name, setName] = useState("");

  useEffect(() => {
    void fetch("/api/staff/me", { credentials: "include" }).then(async (r) => {
      if (!r.ok) return;
      const j = (await r.json()) as {
        staff: { name: string; salaryPayments: Pay[] };
      };
      setName(j.staff.name);
      setRows(j.staff.salaryPayments);
    });
  }, []);

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-2xl font-semibold text-white">Salary history</h1>
      <p className="text-sm text-slate-400">{name ? `Payments for ${name}` : "Loading…"}</p>
      <div className="overflow-x-auto rounded-2xl border border-white/10">
        <table className="min-w-full text-left text-sm text-slate-200">
          <thead className="bg-[#0a101f] text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Month</th>
              <th className="px-4 py-3">Gross</th>
              <th className="px-4 py-3">Deduction</th>
              <th className="px-4 py-3">Net</th>
              <th className="px-4 py-3">Paid</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-slate-500">
                  No salary payments yet.
                </td>
              </tr>
            ) : (
              rows.map((p) => (
                <tr key={p.id} className="border-t border-white/5">
                  <td className="px-4 py-3 font-mono text-xs">{p.monthKey}</td>
                  <td className="px-4 py-3 tabular-nums">{p.grossUgx.toLocaleString()}</td>
                  <td className="px-4 py-3 tabular-nums">{p.deductionUgx.toLocaleString()}</td>
                  <td className="px-4 py-3 tabular-nums text-emerald-300">
                    {p.netUgx.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">
                    {p.paidAt ? new Date(p.paidAt).toLocaleDateString() : "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
