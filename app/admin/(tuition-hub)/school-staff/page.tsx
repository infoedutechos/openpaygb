"use client";



import { Fragment, useCallback, useEffect, useMemo, useState } from "react";

import { formatUgx } from "@/components/admin/school/SchoolContextBar";

import { useSchoolAdminApi } from "@/hooks/useSchoolAdminApi";



type Staff = {

  id: string;

  staffCode: string;

  name: string;

  phone: string;

  email: string;

  address: string;

  sex: string;

  employmentDate: string | null;

  duty: string;

  salaryUgx: number;

  status: string;

};



type SalaryRow = {

  id: string;

  staffCode: string;

  staffName: string;

  monthKey: string;

  netUgx: number;

  paidAt: string | null;

};



const TABS = ["active", "inactive", "salary", "profile"] as const;



function isTeachingDuty(duty: string): boolean {

  return /teach|dos|head/i.test(duty);

}



export default function SchoolStaffPage() {

  const { schoolFetch } = useSchoolAdminApi();

  const [tab, setTab] = useState<(typeof TABS)[number]>("active");

  const [staff, setStaff] = useState<Staff[]>([]);

  const [salaryRows, setSalaryRows] = useState<SalaryRow[]>([]);

  const [profileId, setProfileId] = useState<string | null>(null);

  const [editId, setEditId] = useState<string | null>(null);

  const [form, setForm] = useState({

    staffCode: "",

    name: "",

    phone: "",

    email: "",

    address: "",

    sex: "other",

    employmentDate: "",

    duty: "",

    salaryUgx: 0,

  });



  const load = useCallback(async () => {

    if (tab === "salary") {

      const r = await schoolFetch("/api/admin/school/outflow", undefined, { kind: "salary" });

      if (r.ok) {

        const j = (await r.json()) as { salaryPayments?: SalaryRow[] };

        setSalaryRows(j.salaryPayments ?? []);

      }

      return;

    }

    const status = tab === "inactive" ? "inactive" : "active";

    const r = await schoolFetch("/api/admin/school/staff", undefined, { status });

    if (!r.ok) return;

    const j = (await r.json()) as { staff?: Staff[] };

    setStaff(j.staff ?? []);

  }, [schoolFetch, tab]);



  useEffect(() => {

    void load();

  }, [load]);



  const profile = staff.find((s) => s.id === profileId) ?? staff.find((s) => s.id === editId);

  const teaching = staff.filter((s) => isTeachingDuty(s.duty));

  const nonTeaching = staff.filter((s) => !isTeachingDuty(s.duty));

  const totalSalary = staff.reduce((s, x) => s + x.salaryUgx, 0);



  const groupedStaff = useMemo(

    () =>

      [

        { label: "TEACHING STAFF", rows: teaching, totalSalary: teaching.reduce((s, x) => s + x.salaryUgx, 0) },

        { label: "NON-TEACHING STAFF", rows: nonTeaching, totalSalary: nonTeaching.reduce((s, x) => s + x.salaryUgx, 0) },

      ].filter((g) => g.rows.length > 0),

    [teaching, nonTeaching],

  );



  return (

    <div className="space-y-6">

      <div>

        <h1 className="text-2xl font-semibold text-white">Staff</h1>

        <p className="text-sm text-slate-400">Teaching and non-teaching staff with salary records.</p>

      </div>



      <div className="flex flex-wrap gap-2">

        {TABS.map((t) => (

          <button

            key={t}

            type="button"

            onClick={() => { setTab(t); setProfileId(null); setEditId(null); }}

            className={`rounded-lg px-3 py-1.5 text-sm capitalize ${tab === t ? "bg-violet-900/50 text-violet-100" : "text-slate-400"}`}

          >

            {t === "salary" ? "Salary history" : t === "profile" ? "Staff profile" : `${t} staff`}

          </button>

        ))}

      </div>



      {(tab === "active" || tab === "inactive") && (

        <>

          <form

            className="grid gap-2 rounded-xl border border-white/10 bg-[#0a101f] p-4 sm:grid-cols-2"

            onSubmit={(e) => {

              e.preventDefault();

              void (async () => {

                const url = editId ? `/api/admin/school/staff/${editId}` : "/api/admin/school/staff";

                const method = editId ? "PATCH" : "POST";

                await schoolFetch(url, {

                  method,

                  headers: { "Content-Type": "application/json" },

                  body: JSON.stringify(form),

                });

                setForm({ staffCode: "", name: "", phone: "", email: "", address: "", sex: "other", employmentDate: "", duty: "", salaryUgx: 0 });

                setEditId(null);

                await load();

              })();

            }}

          >

            <input placeholder="Staff ID" required value={form.staffCode} onChange={(e) => setForm({ ...form, staffCode: e.target.value })} className="rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-white" disabled={Boolean(editId)} />

            <input placeholder="Name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-white" />

            <input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-white" />

            <input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-white" />

            <input placeholder="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-white sm:col-span-2" />

            <select value={form.sex} onChange={(e) => setForm({ ...form, sex: e.target.value })} className="rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-white">

              <option value="male">Male</option>

              <option value="female">Female</option>

              <option value="other">Other</option>

            </select>

            <input type="date" value={form.employmentDate} onChange={(e) => setForm({ ...form, employmentDate: e.target.value })} className="rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-white" />

            <input placeholder="Duty (e.g. DOS)" value={form.duty} onChange={(e) => setForm({ ...form, duty: e.target.value })} className="rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-white" />

            <input type="number" placeholder="Salary UGX" value={form.salaryUgx || ""} onChange={(e) => setForm({ ...form, salaryUgx: Number(e.target.value) })} className="rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-white" />

            <button type="submit" className="sm:col-span-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white">

              {editId ? "Update staff" : "Add staff"}

            </button>

          </form>



          {tab === "active" && staff.length > 0 ? (

            <p className="text-xs text-slate-400">

              TEACHING: {teaching.length} ({formatUgx(teaching.reduce((s, x) => s + x.salaryUgx, 0))}) ·

              NON-TEACHING: {nonTeaching.length} · Total staff: {staff.length} · Total salary: {formatUgx(totalSalary)}

            </p>

          ) : null}



          <div className="space-y-3 md:hidden">

            {groupedStaff.map((group) => (

              <div key={group.label}>

                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-violet-200">

                  {group.label} — {group.rows.length} · {formatUgx(group.totalSalary)}

                </p>

                {group.rows.map((s) => (

                  <article key={s.id} className="mb-2 rounded-xl border border-white/10 bg-[#0a101f] p-4 text-sm text-slate-200">

                    <p className="font-medium text-white">{s.name}</p>

                    <p className="mt-1 text-xs text-slate-400">{s.staffCode} · {s.duty}</p>

                    <p className="mt-2">{formatUgx(s.salaryUgx)}</p>

                    <div className="mt-3 flex flex-wrap gap-3">

                      <button type="button" className="text-xs text-cyan-300" onClick={() => { setTab("profile"); setProfileId(s.id); }}>Profile</button>

                      <button type="button" className="text-xs text-amber-300" onClick={() => {

                        setEditId(s.id);

                        setForm({

                          staffCode: s.staffCode,

                          name: s.name,

                          phone: s.phone,

                          email: s.email,

                          address: s.address,

                          sex: s.sex,

                          employmentDate: s.employmentDate?.slice(0, 10) ?? "",

                          duty: s.duty,

                          salaryUgx: s.salaryUgx,

                        });

                      }}>Edit</button>

                      {s.status === "active" ? (

                        <button type="button" className="text-xs text-rose-300" onClick={() => void schoolFetch(`/api/admin/school/staff/${s.id}`, { method: "DELETE" }).then(() => load())}>Deactivate</button>

                      ) : null}

                    </div>

                  </article>

                ))}

              </div>

            ))}

          </div>



          <div className="hidden overflow-x-auto rounded-xl border border-white/10 md:block">

            <table className="min-w-full text-sm">

              <thead className="bg-white/5 text-left text-slate-400">

                <tr>

                  <th className="px-4 py-2">ID</th>

                  <th className="px-4 py-2">Name</th>

                  <th className="px-4 py-2">Duty</th>

                  <th className="px-4 py-2">Salary</th>

                  <th className="px-4 py-2" />

                </tr>

              </thead>

              <tbody>

                {groupedStaff.map((group) => (

                  <Fragment key={group.label}>

                    <tr className="bg-violet-950/30 text-violet-100">

                      <td colSpan={5} className="px-4 py-2 text-xs font-semibold uppercase tracking-wide">

                        {group.label} — {group.rows.length} staff · {formatUgx(group.totalSalary)}

                      </td>

                    </tr>

                    {group.rows.map((s) => (

                      <tr key={s.id} className="border-t border-white/10 text-slate-200">

                        <td className="px-4 py-2">{s.staffCode}</td>

                        <td className="px-4 py-2">{s.name}</td>

                        <td className="px-4 py-2">{s.duty}</td>

                        <td className="px-4 py-2">{formatUgx(s.salaryUgx)}</td>

                        <td className="px-4 py-2 text-right space-x-2">

                          <button type="button" className="text-xs text-cyan-300" onClick={() => { setTab("profile"); setProfileId(s.id); }}>Profile</button>

                          <button type="button" className="text-xs text-amber-300" onClick={() => {

                            setEditId(s.id);

                            setForm({

                              staffCode: s.staffCode,

                              name: s.name,

                              phone: s.phone,

                              email: s.email,

                              address: s.address,

                              sex: s.sex,

                              employmentDate: s.employmentDate?.slice(0, 10) ?? "",

                              duty: s.duty,

                              salaryUgx: s.salaryUgx,

                            });

                          }}>Edit</button>

                          {s.status === "active" ? (

                            <button type="button" className="text-xs text-rose-300" onClick={() => void schoolFetch(`/api/admin/school/staff/${s.id}`, { method: "DELETE" }).then(() => load())}>Deactivate</button>

                          ) : null}

                        </td>

                      </tr>

                    ))}

                  </Fragment>

                ))}

                {staff.length === 0 ? (

                  <tr>

                    <td colSpan={5} className="px-4 py-8 text-center text-slate-500">No staff records.</td>

                  </tr>

                ) : null}

              </tbody>

            </table>

          </div>

        </>

      )}



      {tab === "salary" ? (

        <>

          <div className="space-y-3 md:hidden">

            {salaryRows.map((r) => (

              <article key={r.id} className="rounded-xl border border-white/10 bg-[#0a101f] p-4 text-sm text-slate-200">

                <p className="font-medium text-white">{r.staffName}</p>

                <p className="mt-1 text-xs text-slate-400">{r.monthKey}</p>

                <p className="mt-2">{formatUgx(r.netUgx)}</p>

                <p className="mt-1 text-xs text-slate-500">Paid: {r.paidAt?.slice(0, 10) ?? "—"}</p>

              </article>

            ))}

          </div>

          <div className="hidden overflow-x-auto rounded-xl border border-white/10 md:block">

            <table className="min-w-full text-sm">

              <thead className="bg-white/5 text-left text-slate-400">

                <tr>

                  <th className="px-4 py-2">Staff</th>

                  <th className="px-4 py-2">Month</th>

                  <th className="px-4 py-2">Net</th>

                  <th className="px-4 py-2">Paid</th>

                </tr>

              </thead>

              <tbody>

                {salaryRows.map((r) => (

                  <tr key={r.id} className="border-t border-white/10 text-slate-200">

                    <td className="px-4 py-2">{r.staffName}</td>

                    <td className="px-4 py-2">{r.monthKey}</td>

                    <td className="px-4 py-2">{formatUgx(r.netUgx)}</td>

                    <td className="px-4 py-2">{r.paidAt?.slice(0, 10) ?? "—"}</td>

                  </tr>

                ))}

              </tbody>

            </table>

          </div>

        </>

      ) : null}



      {tab === "profile" && profile ? (

        <div className="rounded-xl border border-white/10 bg-[#0a101f] p-4 text-sm text-slate-200 space-y-1">

          <p className="text-lg font-semibold text-white">{profile.name}</p>

          <p>Staff ID: {profile.staffCode}</p>

          <p>Sex: {profile.sex}</p>

          <p>Phone: {profile.phone || "—"}</p>

          <p>Email: {profile.email || "—"}</p>

          <p>Address: {profile.address || "—"}</p>

          <p>Employment: {profile.employmentDate?.slice(0, 10) ?? "—"}</p>

          <p>Duty: {profile.duty}</p>

          <p>Salary: {formatUgx(profile.salaryUgx)}</p>

        </div>

      ) : tab === "profile" ? (

        <p className="text-sm text-slate-500">Select a staff member from Active staff and click Profile.</p>

      ) : null}

    </div>

  );

}

