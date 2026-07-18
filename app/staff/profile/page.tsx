"use client";

import { useEffect, useState } from "react";

type StaffMe = {
  staff: {
    name: string;
    staffCode: string;
    phone: string;
    email: string;
    address: string;
    sex: string;
    employmentDate: string | null;
    duty: string;
    salaryUgx: number;
    status: string;
    organizationName: string;
  };
};

export default function StaffProfilePage() {
  const [data, setData] = useState<StaffMe | null>(null);

  useEffect(() => {
    void fetch("/api/staff/me", { credentials: "include" })
      .then(async (r) => {
        if (r.ok) setData((await r.json()) as StaffMe);
      });
  }, []);

  if (!data) return <p className="text-sm text-slate-400">Loading…</p>;
  const s = data.staff;

  const rows: [string, string][] = [
    ["Staff ID", s.staffCode],
    ["Name", s.name],
    ["Organization", s.organizationName],
    ["Duty", s.duty || "—"],
    ["Phone", s.phone || "—"],
    ["Email", s.email || "—"],
    ["Address", s.address || "—"],
    ["Sex", s.sex],
    ["Employment date", s.employmentDate || "—"],
    ["Status", s.status],
    ["Contract salary", `UGX ${s.salaryUgx.toLocaleString()}`],
  ];

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <h1 className="text-2xl font-semibold text-white">My profile</h1>
      <dl className="space-y-3 rounded-2xl border border-white/10 bg-[#0a101f] p-5 text-sm">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-4">
            <dt className="text-slate-500">{k}</dt>
            <dd className="text-right text-slate-200">{v}</dd>
          </div>
        ))}
      </dl>
      <p className="text-xs text-slate-500">
        To update personal details or your portal password, contact your school or institution admin.
      </p>
    </div>
  );
}
