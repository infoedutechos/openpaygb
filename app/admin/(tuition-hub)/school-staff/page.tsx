"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { PasswordRevealInput } from "@/components/PasswordRevealInput";
import { formatUgx } from "@/components/admin/school/SchoolContextBar";
import { useSchoolAdminApi } from "@/hooks/useSchoolAdminApi";
import { isTeachingDutyLabel, type StaffDuty } from "@/lib/staff-duties";

type Staff = {
  id: string;
  staffCode: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  sex: string;
  dateOfBirth: string | null;
  employmentDate: string | null;
  duty: string;
  salaryUgx: number;
  status: string;
  portalSignInEnabled?: boolean;
};

type SalaryRow = {
  id: string;
  staffCode: string;
  staffName: string;
  monthKey: string;
  netUgx: number;
  paidAt: string | null;
};

type StaffForm = {
  staffCode: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  sex: string;
  dateOfBirth: string;
  employmentDate: string;
  duty: string;
  salaryUgx: number;
  portalPassword: string;
};

const TABS = ["active", "inactive", "salary", "profile"] as const;

const EMPTY_FORM: StaffForm = {
  staffCode: "",
  name: "",
  phone: "",
  email: "",
  address: "",
  sex: "other",
  dateOfBirth: "",
  employmentDate: "",
  duty: "",
  salaryUgx: 0,
  portalPassword: "",
};

function formFromStaff(s: Staff): StaffForm {
  return {
    staffCode: s.staffCode,
    name: s.name,
    phone: s.phone,
    email: s.email,
    address: s.address,
    sex: s.sex,
    dateOfBirth: s.dateOfBirth?.slice(0, 10) ?? "",
    employmentDate: s.employmentDate?.slice(0, 10) ?? "",
    duty: s.duty,
    salaryUgx: s.salaryUgx,
    portalPassword: "",
  };
}

export default function SchoolStaffPage() {
  const { schoolFetch } = useSchoolAdminApi();
  const [tab, setTab] = useState<(typeof TABS)[number]>("active");
  const [staff, setStaff] = useState<Staff[]>([]);
  const [salaryRows, setSalaryRows] = useState<SalaryRow[]>([]);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<StaffForm>(EMPTY_FORM);
  const [staffFormatConfigured, setStaffFormatConfigured] = useState(true);
  const [allocBusy, setAllocBusy] = useState(false);
  const [duties, setDuties] = useState<StaffDuty[]>([]);
  const [dutiesConfigured, setDutiesConfigured] = useState(false);
  const [newDutyLabel, setNewDutyLabel] = useState("");
  const [newDutyCategory, setNewDutyCategory] = useState<"teaching" | "non_teaching">("teaching");
  const [dutiesBusy, setDutiesBusy] = useState(false);
  const [dutiesMsg, setDutiesMsg] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const allocateStaffId = useCallback(async () => {
    setAllocBusy(true);
    try {
      const r = await schoolFetch("/api/admin/school/staff/next-code");
      const j = (await r.json()) as {
        staffCode?: string;
        staffFormatConfigured?: boolean;
        error?: string;
      };
      if (!r.ok || !j.staffCode) return;
      setForm((f) => ({ ...f, staffCode: j.staffCode! }));
      setStaffFormatConfigured(Boolean(j.staffFormatConfigured));
    } finally {
      setAllocBusy(false);
    }
  }, [schoolFetch]);

  const loadDuties = useCallback(async () => {
    const r = await schoolFetch("/api/admin/school/staff/duties");
    if (!r.ok) return;
    const j = (await r.json()) as { duties?: StaffDuty[]; configured?: boolean };
    setDuties(j.duties ?? []);
    setDutiesConfigured(Boolean(j.configured));
  }, [schoolFetch]);

  useEffect(() => {
    if (editId) return;
    void allocateStaffId();
  }, [allocateStaffId, editId]);

  useEffect(() => {
    void loadDuties();
  }, [loadDuties]);

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
  const teaching = staff.filter((s) => isTeachingDutyLabel(s.duty, duties));
  const nonTeaching = staff.filter((s) => !isTeachingDutyLabel(s.duty, duties));
  const totalSalary = staff.reduce((s, x) => s + x.salaryUgx, 0);

  const groupedStaff = useMemo(
    () =>
      [
        { label: "TEACHING STAFF", rows: teaching, totalSalary: teaching.reduce((s, x) => s + x.salaryUgx, 0) },
        {
          label: "NON-TEACHING STAFF",
          rows: nonTeaching,
          totalSalary: nonTeaching.reduce((s, x) => s + x.salaryUgx, 0),
        },
      ].filter((g) => g.rows.length > 0),
    [teaching, nonTeaching],
  );

  const dutyOptions = useMemo(() => {
    const labels = duties.map((d) => d.label);
    if (form.duty && !labels.some((l) => l.toLowerCase() === form.duty.toLowerCase())) {
      return [...duties, { label: form.duty, category: "non_teaching" as const }];
    }
    return duties;
  }, [duties, form.duty]);

  async function saveDuties(next: StaffDuty[]) {
    setDutiesBusy(true);
    setDutiesMsg(null);
    try {
      const r = await schoolFetch("/api/admin/school/staff/duties", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ duties: next }),
      });
      const j = (await r.json()) as { duties?: StaffDuty[]; error?: string };
      if (!r.ok) throw new Error(j.error || "Could not save duties");
      setDuties(j.duties ?? next);
      setDutiesConfigured(true);
      setDutiesMsg("Duties list saved — available in the Duty dropdown.");
    } catch (e) {
      setDutiesMsg(e instanceof Error ? e.message : "Could not save duties");
    } finally {
      setDutiesBusy(false);
    }
  }

  function addDuty() {
    const label = newDutyLabel.trim();
    if (!label) return;
    if (duties.some((d) => d.label.toLowerCase() === label.toLowerCase())) {
      setDutiesMsg(`“${label}” is already in the list.`);
      return;
    }
    const next = [...duties, { label, category: newDutyCategory }];
    setNewDutyLabel("");
    void saveDuties(next);
  }

  function removeDuty(label: string) {
    const next = duties.filter((d) => d.label !== label);
    if (!next.length) {
      setDutiesMsg("Keep at least one duty in the catalogue.");
      return;
    }
    void saveDuties(next);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Staff</h1>
        <p className="text-sm text-slate-400">
          Teaching and non-teaching staff with salary records. Configure duties below, then pick them when adding
          staff. Staff IDs auto-allocate like admission numbers; set a portal password so employees can sign in at{" "}
          <a href="/staff/login" className="text-cyan-400 hover:underline">
            /staff/login
          </a>
          .
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => {
              setTab(t);
              setProfileId(null);
              setEditId(null);
            }}
            className={`rounded-lg px-3 py-1.5 text-sm capitalize ${
              tab === t ? "bg-violet-900/50 text-violet-100" : "text-slate-400"
            }`}
          >
            {t === "salary" ? "Salary history" : t === "profile" ? "Staff profile" : `${t} staff`}
          </button>
        ))}
      </div>

      {(tab === "active" || tab === "inactive") && (
        <>
          <section className="rounded-xl border border-violet-500/25 bg-violet-950/15 p-4">
            <h2 className="text-sm font-semibold text-violet-100">Configure duties</h2>
            <p className="mt-1 text-xs text-slate-400">
              Duties you add here appear in the Duty list on the staff form
              {dutiesConfigured ? "" : " (showing defaults until you save your own catalogue)"}.
            </p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {duties.map((d) => (
                <li
                  key={d.label}
                  className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-black/25 px-2.5 py-1.5 text-xs text-slate-200"
                >
                  <span>
                    {d.label}
                    <span className="ml-1 text-slate-500">
                      ({d.category === "teaching" ? "teaching" : "non-teaching"})
                    </span>
                  </span>
                  <button
                    type="button"
                    disabled={dutiesBusy}
                    onClick={() => removeDuty(d.label)}
                    className="text-rose-300 hover:text-rose-200 disabled:opacity-50"
                    aria-label={`Remove ${d.label}`}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex flex-wrap items-end gap-2">
              <label className="block text-xs text-slate-500">
                New duty
                <input
                  value={newDutyLabel}
                  onChange={(e) => setNewDutyLabel(e.target.value)}
                  placeholder="e.g. Librarian"
                  className="mt-1 block w-44 rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white"
                />
              </label>
              <label className="block text-xs text-slate-500">
                Category
                <select
                  value={newDutyCategory}
                  onChange={(e) =>
                    setNewDutyCategory(e.target.value as "teaching" | "non_teaching")
                  }
                  className="mt-1 block rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white"
                >
                  <option value="teaching">Teaching</option>
                  <option value="non_teaching">Non-teaching</option>
                </select>
              </label>
              <button
                type="button"
                disabled={dutiesBusy || !newDutyLabel.trim()}
                onClick={() => addDuty()}
                className="rounded-lg bg-violet-600 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-500 disabled:opacity-50"
              >
                {dutiesBusy ? "Saving…" : "Add to duties list"}
              </button>
            </div>
            {dutiesMsg ? <p className="mt-2 text-xs text-cyan-200/90">{dutiesMsg}</p> : null}
          </section>

          <form
            className="grid gap-2 rounded-xl border border-white/10 bg-[#0a101f] p-4 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              setFormError(null);
              void (async () => {
                if (!form.duty.trim()) {
                  setFormError("Select a duty from the configured list.");
                  return;
                }
                const url = editId ? `/api/admin/school/staff/${editId}` : "/api/admin/school/staff";
                const method = editId ? "PATCH" : "POST";
                const r = await schoolFetch(url, {
                  method,
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(form),
                });
                if (!r.ok) {
                  const j = (await r.json().catch(() => ({}))) as { error?: string };
                  setFormError(j.error || "Could not save staff");
                  return;
                }
                setForm(EMPTY_FORM);
                setEditId(null);
                await load();
                if (!editId) void allocateStaffId();
              })();
            }}
          >
            <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
              <input
                placeholder="Staff ID"
                required={!editId}
                value={form.staffCode}
                onChange={(e) => setForm({ ...form, staffCode: e.target.value.toUpperCase() })}
                className="min-w-[12rem] flex-1 rounded-lg border border-white/15 bg-black/30 px-3 py-2 font-mono text-white"
                disabled={Boolean(editId)}
              />
              {!editId ? (
                <button
                  type="button"
                  disabled={allocBusy}
                  onClick={() => void allocateStaffId()}
                  className="rounded-lg border border-white/15 px-3 py-2 text-xs text-cyan-300"
                >
                  {allocBusy ? "…" : "Regen"}
                </button>
              ) : null}
              {!staffFormatConfigured && !editId ? (
                <a href="/admin/settings#staff-id" className="text-xs text-amber-300 hover:underline">
                  Configure Staff ID format
                </a>
              ) : null}
            </div>

            <input
              placeholder="Name"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-white"
            />
            <input
              placeholder="Phone"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-white"
            />
            <input
              placeholder="Email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-white"
            />
            <input
              placeholder="Address"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-white sm:col-span-2"
            />

            <select
              value={form.sex}
              onChange={(e) => setForm({ ...form, sex: e.target.value })}
              className="rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-white"
            >
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>

            <label className="block text-xs text-slate-500">
              Date of birth
              <input
                type="date"
                value={form.dateOfBirth}
                onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })}
                className="mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white"
              />
            </label>

            <label className="block text-xs text-slate-500">
              Employment date
              <input
                type="date"
                value={form.employmentDate}
                onChange={(e) => setForm({ ...form, employmentDate: e.target.value })}
                className="mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white"
              />
            </label>

            <label className="block text-xs text-slate-500">
              Duty
              <select
                required
                value={form.duty}
                onChange={(e) => setForm({ ...form, duty: e.target.value })}
                className="mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white"
              >
                <option value="">Select duty…</option>
                {dutyOptions.map((d) => (
                  <option key={d.label} value={d.label}>
                    {d.label} ({d.category === "teaching" ? "teaching" : "non-teaching"})
                  </option>
                ))}
              </select>
            </label>

            <input
              type="number"
              placeholder="Salary UGX"
              value={form.salaryUgx || ""}
              onChange={(e) => setForm({ ...form, salaryUgx: Number(e.target.value) })}
              className="rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-white"
            />

            <div className="sm:col-span-2">
              <label className="block text-xs text-slate-500" htmlFor="staff-portal-password">
                Portal password {editId ? "(optional — leave blank to keep)" : "(optional, min 8)"}
              </label>
              <PasswordRevealInput
                id="staff-portal-password"
                value={form.portalPassword}
                onChange={(value) => setForm({ ...form, portalPassword: value })}
                placeholder={editId ? "New portal password (optional)" : "Portal password (optional, min 8)"}
                className="mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white"
                autoComplete="new-password"
                minLength={form.portalPassword ? 8 : undefined}
                togglePresentation="text"
              />
            </div>

            {formError ? (
              <p className="rounded-lg border border-rose-500/40 bg-rose-950/30 px-3 py-2 text-sm text-rose-100 sm:col-span-2">
                {formError}
              </p>
            ) : null}

            <button
              type="submit"
              className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white sm:col-span-2"
            >
              {editId ? "Update staff" : "Add staff"}
            </button>
          </form>

          {tab === "active" && staff.length > 0 ? (
            <p className="text-xs text-slate-400">
              TEACHING: {teaching.length} ({formatUgx(teaching.reduce((s, x) => s + x.salaryUgx, 0))}) · NON-TEACHING:{" "}
              {nonTeaching.length} · Total staff: {staff.length} · Total salary: {formatUgx(totalSalary)}
            </p>
          ) : null}

          <div className="space-y-3 md:hidden">
            {groupedStaff.map((group) => (
              <div key={group.label}>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-violet-200">
                  {group.label} — {group.rows.length} · {formatUgx(group.totalSalary)}
                </p>
                {group.rows.map((s) => (
                  <article
                    key={s.id}
                    className="mb-2 rounded-xl border border-white/10 bg-[#0a101f] p-4 text-sm text-slate-200"
                  >
                    <p className="font-medium text-white">{s.name}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      {s.staffCode} · {s.duty}
                    </p>
                    <p className="mt-2">{formatUgx(s.salaryUgx)}</p>
                    <div className="mt-3 flex flex-wrap gap-3">
                      <button
                        type="button"
                        className="text-xs text-cyan-300"
                        onClick={() => {
                          setTab("profile");
                          setProfileId(s.id);
                        }}
                      >
                        Profile
                      </button>
                      <button
                        type="button"
                        className="text-xs text-amber-300"
                        onClick={() => {
                          setEditId(s.id);
                          setForm(formFromStaff(s));
                        }}
                      >
                        Edit
                      </button>
                      {s.status === "active" ? (
                        <button
                          type="button"
                          className="text-xs text-rose-300"
                          onClick={() =>
                            void schoolFetch(`/api/admin/school/staff/${s.id}`, { method: "DELETE" }).then(() =>
                              load(),
                            )
                          }
                        >
                          Deactivate
                        </button>
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
                        <td className="space-x-2 px-4 py-2 text-right">
                          <button
                            type="button"
                            className="text-xs text-cyan-300"
                            onClick={() => {
                              setTab("profile");
                              setProfileId(s.id);
                            }}
                          >
                            Profile
                          </button>
                          <button
                            type="button"
                            className="text-xs text-amber-300"
                            onClick={() => {
                              setEditId(s.id);
                              setForm(formFromStaff(s));
                            }}
                          >
                            Edit
                          </button>
                          {s.status === "active" ? (
                            <button
                              type="button"
                              className="text-xs text-rose-300"
                              onClick={() =>
                                void schoolFetch(`/api/admin/school/staff/${s.id}`, {
                                  method: "DELETE",
                                }).then(() => load())
                              }
                            >
                              Deactivate
                            </button>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </Fragment>
                ))}
                {staff.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                      No staff records.
                    </td>
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
              <article
                key={r.id}
                className="rounded-xl border border-white/10 bg-[#0a101f] p-4 text-sm text-slate-200"
              >
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
        <div className="space-y-1 rounded-xl border border-white/10 bg-[#0a101f] p-4 text-sm text-slate-200">
          <p className="text-lg font-semibold text-white">{profile.name}</p>
          <p>Staff ID: {profile.staffCode}</p>
          <p>Sex: {profile.sex}</p>
          <p>Date of birth: {profile.dateOfBirth?.slice(0, 10) ?? "—"}</p>
          <p>Phone: {profile.phone || "—"}</p>
          <p>Email: {profile.email || "—"}</p>
          <p>Address: {profile.address || "—"}</p>
          <p>Employment: {profile.employmentDate?.slice(0, 10) ?? "—"}</p>
          <p>Duty: {profile.duty}</p>
          <p>Salary: {formatUgx(profile.salaryUgx)}</p>
          <p>Portal sign-in: {profile.portalSignInEnabled ? "Enabled" : "Not set"}</p>
        </div>
      ) : tab === "profile" ? (
        <p className="text-sm text-slate-500">Select a staff member from Active staff and click Profile.</p>
      ) : null}
    </div>
  );
}
