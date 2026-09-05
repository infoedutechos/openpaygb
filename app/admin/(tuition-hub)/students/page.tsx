"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { SchoolDetailModal } from "@/components/admin/SchoolDetailModal";
import { SchoolBulkBillsPanel } from "@/components/admin/school/SchoolBulkBillsPanel";
import { SchoolBillStudentModal } from "@/components/admin/school/SchoolBillStudentModal";
import { SchoolPayBillModal } from "@/components/admin/school/SchoolPayBillModal";
import { SchoolStudentActionSheet } from "@/components/admin/school/SchoolStudentActionSheet";
import { SchoolStudentEditModal } from "@/components/admin/school/SchoolStudentEditModal";
import { SchoolStudentImportModal } from "@/components/admin/school/SchoolStudentImportModal";
import { SchoolPayCodePanel } from "@/components/admin/SchoolPayCodePanel";
import { StudentShareCard, type StudentShareCardData } from "@/components/admin/StudentShareCard";
import { TuitionHubCheckoutExplainerCompact } from "@/components/admin/TuitionHubCheckoutExplainer";
import { TenantList } from "@/components/tuition/TenantList";
import { useTuitionAdminGate } from "@/hooks/useTuitionAdminGate";
import { useMasterOrgSlug } from "@/hooks/useMasterOrgSlug";
import { useSchoolAdminApi } from "@/hooks/useSchoolAdminApi";
import { useSchoolClassFilter } from "@/hooks/useSchoolClassFilter";

type ClassOption = {
  id: string;
  code: string;
  name: string;
  streams: { id: string; code: string; name: string }[];
};

type StudentRow = {
  id: string;
  name: string;
  admissionNo?: string;
  sex?: string;
  address?: string;
  email: string;
  phone: string;
  telegramId: string;
  programmeCode: string;
  schoolClassCode?: string | null;
  schoolStreamCode?: string | null;
  year: number;
  semester: number;
  createdAt: string;
  organizationSlug?: string;
  organizationName?: string;
};

export default function AdminStudentsPage() {
  const { orgSlug, setOrgSlug } = useMasterOrgSlug();
  const { schoolScope, schoolFetch, organizationSlug } = useSchoolAdminApi();
  const isSchoolTenant = schoolScope;
  const periodLabel = isSchoolTenant ? "Term" : "Semester";
  const { loading: authLoading, ensureTuitionSession } = useTuitionAdminGate();
  const [q, setQ] = useState("");
  const organizationSlugFilter = orgSlug;
  const setOrganizationSlugFilter = setOrgSlug;
  const [rows, setRows] = useState<StudentRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isMaster, setIsMaster] = useState(false);
  const [schoolSlug, setSchoolSlug] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [createBusy, setCreateBusy] = useState(false);
  const [admissionBusy, setAdmissionBusy] = useState(false);
  const [admissionFormatConfigured, setAdmissionFormatConfigured] = useState(true);
  const [createdShare, setCreatedShare] = useState<StudentShareCardData | null>(null);
  const [createForm, setCreateForm] = useState({
    name: "",
    admissionNo: "",
    sex: "other" as "male" | "female" | "other",
    address: "",
    email: "",
    phone: "",
    programmeCode: "",
    schoolClassId: "",
    schoolStreamId: "",
    year: 1,
    semester: 1,
    password: "",
  });
  const [schoolClasses, setSchoolClasses] = useState<ClassOption[]>([]);
  const [classFilter, setClassFilter] = useSchoolClassFilter();
  const [payBillStudent, setPayBillStudent] = useState<{ id: string; name: string } | null>(null);
  const [billStudent, setBillStudent] = useState<{ id: string; name: string } | null>(null);
  const [actionStudent, setActionStudent] = useState<{ id: string; name: string } | null>(null);
  const [editStudentId, setEditStudentId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const sp = new URLSearchParams(window.location.search);
    const payId = sp.get("payStudentId")?.trim();
    const billId = sp.get("billStudentId")?.trim();
    if (payId) {
      const payName = sp.get("payStudentName")?.trim() || "Student";
      setPayBillStudent({ id: payId, name: payName });
    }
    if (billId) {
      const billName = sp.get("billStudentName")?.trim() || "Student";
      setBillStudent({ id: billId, name: billName });
    }
    if (!payId && !billId) return;
    sp.delete("payStudentId");
    sp.delete("payStudentName");
    sp.delete("billStudentId");
    sp.delete("billStudentName");
    sp.delete("term");
    const qstr = sp.toString();
    window.history.replaceState({}, "", `${window.location.pathname}${qstr ? `?${qstr}` : ""}`);
  }, []);

  const fetchNextAdmission = useCallback(async () => {
    setAdmissionBusy(true);
    try {
      const qp = new URLSearchParams();
      const slugTrim = organizationSlugFilter.trim().toLowerCase();
      if (slugTrim && isMaster) qp.set("organizationSlug", slugTrim);
      const r = await fetch(`/api/students/next-admission${qp.toString() ? `?${qp}` : ""}`, {
        credentials: "include",
      });
      const j = (await r.json()) as {
        admissionNo?: string;
        admissionFormatConfigured?: boolean;
        error?: string;
      };
      if (!r.ok || !j.admissionNo) throw new Error(j.error ?? "Could not allocate admission number");
      setCreateForm((f) => ({ ...f, admissionNo: j.admissionNo! }));
      setAdmissionFormatConfigured(Boolean(j.admissionFormatConfigured));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not allocate admission number");
    } finally {
      setAdmissionBusy(false);
    }
  }, [organizationSlugFilter, isMaster]);

  useEffect(() => {
    if (!showCreate) return;
    void fetchNextAdmission();
  }, [showCreate, fetchNextAdmission]);

  useEffect(() => {
    if (!isSchoolTenant) return;
    void schoolFetch("/api/admin/school/classes", undefined, { allSessions: "1" })
      .then(async (r) => {
        if (!r.ok) return;
        const j = (await r.json()) as { classes?: ClassOption[] };
        setSchoolClasses(j.classes ?? []);
      })
      .catch(() => undefined);
  }, [isSchoolTenant, schoolFetch]);

  const load = useCallback(
    async (search: string) => {
      if (authLoading) return;
      const gate = ensureTuitionSession({
        message:
          "Sign in with your tuition hub admin account (email and password) to search students. Open Admin login from the sidebar.",
      });
      if (!gate.ok) {
        if (gate.error) setError(gate.error);
        if (!gate.redirecting) setRows([]);
        return;
      }
      const master = gate.auth.admin?.role === "master";
      setIsMaster(master);

      const limit = master ? 400 : 100;
      const qp = new URLSearchParams();
      qp.set("limit", String(limit));
      qp.set("q", search.trim());
      if (isSchoolTenant && classFilter) qp.set("schoolClassId", classFilter);
      const slugTrim = organizationSlugFilter.trim().toLowerCase();
      if (slugTrim && master) qp.set("organizationSlug", slugTrim);

      const r = await fetch(`/api/students?${qp.toString()}`, { credentials: "include" });
      const j = await r.json();
      if (!r.ok) {
        setError(j.error ?? "Failed to load");
        return;
      }
      setError(null);
      setRows(j.students ?? []);
    },
    [authLoading, ensureTuitionSession, organizationSlugFilter, isSchoolTenant, classFilter]
  );

  useEffect(() => {
    const t = setTimeout(() => {
      void load(q);
    }, 300);
    return () => clearTimeout(t);
  }, [q, load]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">{isSchoolTenant ? "Students / bills" : "Students"}</h1>
        <p className="text-sm text-slate-400">
          Search by name, email, or phone.
          {isMaster ? " As platform master you see records for every tenant; optionally filter by school slug." : null}{" "}
          {isSchoolTenant
            ? "Assign bills to a class or a single student, then record payments. New students inherit classmates’ active-term fees when those already exist."
            : "Programme / year / semester are the student's current enrollment context; actual fee lines and totals for each payment are built at checkout from your programme schedules."}
        </p>
        <TuitionHubCheckoutExplainerCompact className="mt-2 max-w-3xl" />
      </div>
      <SchoolPayCodePanel organizationSlug={isMaster ? organizationSlugFilter.trim().toLowerCase() || undefined : undefined} />
      {isSchoolTenant ? <SchoolBulkBillsPanel onAssigned={() => void load(q)} /> : null}
      {isSchoolTenant ? (
        <div className="flex flex-wrap gap-2 text-sm">
          <button
            type="button"
            onClick={() => { window.location.href = "/api/admin/school/students/export"; }}
            className="rounded-lg border border-white/15 px-3 py-2 text-cyan-300 hover:bg-white/5"
          >
            Export students (CSV)
          </button>
          <button
            type="button"
            onClick={() => setImportOpen(true)}
            className="rounded-lg border border-white/15 px-3 py-2 text-violet-300 hover:bg-white/5"
          >
            Import students
          </button>
          <button
            type="button"
            onClick={() => { window.location.href = "/api/admin/school/bills/export"; }}
            className="rounded-lg border border-white/15 px-3 py-2 text-cyan-300 hover:bg-white/5"
          >
            Export bills (CSV)
          </button>
          <label className="cursor-pointer rounded-lg border border-white/15 px-3 py-2 text-violet-300 hover:bg-white/5">
            Import bills (CSV)
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                void (async () => {
                  const fd = new FormData();
                  fd.set("file", file);
                  await fetch("/api/admin/school/bills/import", { method: "POST", credentials: "include", body: fd });
                })();
              }}
            />
          </label>
        </div>
      ) : null}
      {error && <p className="text-sm text-rose-400">{error}</p>}
      {createdShare ? (
        <StudentShareCard
          variant="modal"
          student={createdShare}
          onClose={() => setCreatedShare(null)}
        />
      ) : null}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
        <button
          type="button"
          onClick={() => setShowCreate((v) => !v)}
          className="text-sm font-semibold text-cyan-300 hover:text-cyan-200"
        >
          {showCreate ? "Hide create student" : "+ Create student"}
        </button>
        {showCreate ? (
          <form
            className="mt-4 grid gap-3 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              void (async () => {
                setCreateBusy(true);
                setError(null);
                try {
                  const r = await fetch("/api/students", {
                    method: "POST",
                    credentials: "include",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      name: createForm.name.trim(),
                      admissionNo: createForm.admissionNo.trim() || undefined,
                      sex: createForm.sex,
                      address: createForm.address.trim() || undefined,
                      email: createForm.email.trim() || undefined,
                      phone: createForm.phone.trim(),
                      ...(isSchoolTenant && createForm.schoolClassId && createForm.schoolStreamId
                        ? {
                            schoolClassId: createForm.schoolClassId,
                            schoolStreamId: createForm.schoolStreamId,
                          }
                        : { programmeCode: createForm.programmeCode.trim() }),
                      year: createForm.year,
                      semester: createForm.semester,
                      ...(createForm.password.trim().length >= 10
                        ? { portalPassword: createForm.password.trim() }
                        : {}),
                      ...(organizationSlug ? { organizationSlug } : {}),
                    }),
                  });
                  const j = (await r.json()) as {
                    student?: StudentShareCardData;
                    error?: string;
                    details?: unknown;
                  };
                  if (!r.ok || !j.student) {
                    const detail =
                      j.details && typeof j.details === "object"
                        ? JSON.stringify(j.details)
                        : "";
                    throw new Error(j.error ? `${j.error}${detail ? ` (${detail})` : ""}` : "Create failed");
                  }
                  setCreatedShare({
                    ...j.student,
                    periodLabel: j.student.periodLabel ?? periodLabel,
                  });
                  setCreateForm({
                    name: "",
                    admissionNo: "",
                    sex: "other",
                    address: "",
                    email: "",
                    phone: "",
                    programmeCode: "",
                    schoolClassId: "",
                    schoolStreamId: "",
                    year: 1,
                    semester: 1,
                    password: "",
                  });
                  setShowCreate(false);
                  await load(q);
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Create failed");
                } finally {
                  setCreateBusy(false);
                }
              })();
            }}
          >
            <input
              required
              placeholder="Full name"
              value={createForm.name}
              onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
              className="rounded-md border border-[var(--border)] bg-[#0d1526] px-3 py-2 text-sm text-white"
            />
            <div className="flex gap-2">
              <input
                readOnly
                required
                placeholder={admissionBusy ? "Generating admission no.…" : "Admission / registration no."}
                title="Auto-generated from your school’s registered students and admission format settings."
                value={createForm.admissionNo}
                className="min-w-0 flex-1 rounded-md border border-cyan-500/30 bg-[#0d1526] px-3 py-2 font-mono text-sm font-semibold tracking-wide text-cyan-100"
              />
              <button
                type="button"
                disabled={admissionBusy}
                onClick={() => void fetchNextAdmission()}
                className="shrink-0 rounded-md border border-white/15 px-2.5 py-2 text-xs text-slate-300 hover:bg-white/5 disabled:opacity-50"
                title="Generate a different admission number"
              >
                {admissionBusy ? "…" : "Regen"}
              </button>
            </div>
            {!admissionFormatConfigured && !isMaster ? (
              <div className="sm:col-span-2 flex flex-wrap items-center gap-3 rounded-lg border border-amber-500/30 bg-amber-950/20 px-3 py-2.5">
                <p className="flex-1 text-xs text-amber-100/90">
                  Your school has not configured a custom admission number format yet. Defaults still work
                  (e.g. RIV-2026-0042). Configure your preferred format in Settings.
                </p>
                <Link
                  href="/admin/settings#admission-number"
                  className="shrink-0 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-500"
                >
                  Configure admission number format
                </Link>
              </div>
            ) : null}
            {isSchoolTenant ? (
              <>
                <select
                  value={createForm.sex}
                  onChange={(e) => setCreateForm((f) => ({ ...f, sex: e.target.value as "male" | "female" | "other" }))}
                  className="rounded-md border border-[var(--border)] bg-[#0d1526] px-3 py-2 text-sm text-white"
                >
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                  <option value="other">Other</option>
                </select>
                <input
                  placeholder="Contact address"
                  value={createForm.address}
                  onChange={(e) => setCreateForm((f) => ({ ...f, address: e.target.value }))}
                  className="rounded-md border border-[var(--border)] bg-[#0d1526] px-3 py-2 text-sm text-white sm:col-span-2"
                />
              </>
            ) : null}
            <input
              type="email"
              placeholder="Email (optional — use admission no. if no email)"
              value={createForm.email}
              onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
              className="rounded-md border border-[var(--border)] bg-[#0d1526] px-3 py-2 text-sm text-white"
            />
            <input
              placeholder={
                createForm.email.trim()
                  ? "Portal password (min 10 chars — required with email)"
                  : createForm.admissionNo.trim()
                    ? "Portal password (min 10 chars — enables login with admission no.)"
                    : "Portal password (optional)"
              }
              value={createForm.password}
              required={Boolean(createForm.email.trim())}
              minLength={
                createForm.email.trim() || createForm.password.trim() || createForm.admissionNo.trim()
                  ? 10
                  : undefined
              }
              onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))}
              className="rounded-md border border-[var(--border)] bg-[#0d1526] px-3 py-2 text-sm text-white"
            />
            <p className="sm:col-span-2 text-xs leading-relaxed text-slate-500">
              Admission / registration number is <strong className="text-slate-400">auto-generated</strong> when you
              open Create student. After you submit, a printable student card with QR code appears so you can share
              via WhatsApp, Telegram, and other apps. Portal sign-in works with{" "}
              <strong className="text-slate-400">email + password</strong> or{" "}
              <strong className="text-slate-400">admission number + password</strong>.
            </p>
            {isSchoolTenant ? (
              <>
                <select
                  required
                  value={createForm.schoolClassId}
                  onChange={(e) =>
                    setCreateForm((f) => ({ ...f, schoolClassId: e.target.value, schoolStreamId: "" }))
                  }
                  className="rounded-md border border-[var(--border)] bg-[#0d1526] px-3 py-2 text-sm text-white"
                >
                  <option value="">Select class</option>
                  {schoolClasses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} — {c.name}
                    </option>
                  ))}
                </select>
                <select
                  required
                  value={createForm.schoolStreamId}
                  onChange={(e) => setCreateForm((f) => ({ ...f, schoolStreamId: e.target.value }))}
                  className="rounded-md border border-[var(--border)] bg-[#0d1526] px-3 py-2 text-sm text-white"
                  disabled={!createForm.schoolClassId}
                >
                  <option value="">Select stream</option>
                  {(schoolClasses.find((c) => c.id === createForm.schoolClassId)?.streams ?? []).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.code} — {s.name}
                    </option>
                  ))}
                </select>
              </>
            ) : (
              <input
                placeholder="Programme code"
                required
                value={createForm.programmeCode}
                onChange={(e) => setCreateForm((f) => ({ ...f, programmeCode: e.target.value }))}
                className="rounded-md border border-[var(--border)] bg-[#0d1526] px-3 py-2 text-sm text-white"
              />
            )}
            <select
              value={createForm.year}
              onChange={(e) => setCreateForm((f) => ({ ...f, year: Number(e.target.value) }))}
              className="rounded-md border border-[var(--border)] bg-[#0d1526] px-3 py-2 text-sm text-white"
            >
              {[1, 2, 3, 4, 5, 6].map((y) => (
                <option key={y} value={y}>
                  Year {y}
                </option>
              ))}
            </select>
            <select
              value={createForm.semester}
              onChange={(e) => setCreateForm((f) => ({ ...f, semester: Number(e.target.value) }))}
              className="rounded-md border border-[var(--border)] bg-[#0d1526] px-3 py-2 text-sm text-white"
            >
              {[1, 2, 3].map((s) => (
                <option key={s} value={s}>
                  {periodLabel} {s}
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={createBusy || admissionBusy || !createForm.admissionNo.trim()}
              className="sm:col-span-2 rounded-lg bg-cyan-600 py-2 text-sm font-semibold text-white hover:bg-cyan-500 disabled:opacity-50"
            >
              {createBusy ? "Creating…" : "Create student"}
            </button>
          </form>
        ) : null}
      </div>
      {isMaster ? (
        <TenantList
          variant="compact"
          filterMode
          currentSlug={organizationSlugFilter || undefined}
          onPickSlug={(slug) => setOrganizationSlugFilter(slug)}
          title="Filter by school (tenant)"
          description="Click a school to filter the table, or clear the slug field below."
        />
      ) : null}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search…"
          className="w-full max-w-md rounded-md border border-[var(--border)] bg-[#0d1526] px-3 py-2 text-sm text-white"
        />
        {isMaster ? (
          <label className="flex w-full max-w-xs flex-col text-xs text-slate-500">
            School slug (optional filter)
            <input
              value={organizationSlugFilter}
              onChange={(e) => setOrganizationSlugFilter(e.target.value.trim().toLowerCase())}
              placeholder="e.g. default"
              className="mt-1 rounded-md border border-[var(--border)] bg-[#0d1526] px-3 py-2 text-sm font-mono text-white placeholder:text-slate-600"
            />
          </label>
        ) : null}
        {isSchoolTenant ? (
          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="w-full max-w-xs rounded-md border border-[var(--border)] bg-[#0d1526] px-3 py-2 text-sm text-white"
          >
            <option value="">All classes</option>
            {schoolClasses.map((c) => (
              <option key={c.id} value={c.id}>{c.code}</option>
            ))}
          </select>
        ) : null}
      </div>
      <div className="space-y-3 md:hidden">
        {rows.map((s) => (
          <Link
            key={s.id}
            href={`/admin/students/${s.id}`}
            className="block rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 hover:border-cyan-500/30"
          >
            <p className="font-medium text-sky-400">{s.name}</p>
            <p className="mt-1 text-xs text-slate-400">
              {s.schoolClassCode && s.schoolStreamCode
                ? `${s.schoolClassCode}/${s.schoolStreamCode}`
                : s.programmeCode}{" "}
              · Yr{s.year} {periodLabel.slice(0, 1)}
              {s.semester}
            </p>
            {isMaster && s.organizationSlug ? (
              <p className="mt-1 text-xs text-slate-500">
                {s.organizationName ?? s.organizationSlug}
                <span className="ml-1 font-mono text-cyan-200/80">({s.organizationSlug})</span>
              </p>
            ) : null}
            <p className="mt-2 truncate text-xs text-slate-500">{s.email || s.phone || "—"}</p>
            {isSchoolTenant ? (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  setActionStudent({ id: s.id, name: s.name });
                }}
                className="mt-2 text-xs font-semibold text-violet-300"
              >
                Actions
              </button>
            ) : null}
          </Link>
        ))}
      </div>
      <div className="hidden overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--card)] md:block">
        <table className="min-w-full text-left text-sm text-slate-200">
          <thead className="border-b border-[var(--border)] text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2">Name</th>
              {isSchoolTenant ? <th className="px-3 py-2">Admission</th> : null}
              {isSchoolTenant ? <th className="px-3 py-2">Sex</th> : null}
              <th className="px-3 py-2">School</th>
              <th className="px-3 py-2">Programme</th>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Phone</th>
              {isSchoolTenant ? <th className="px-3 py-2">Actions</th> : null}
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s.id} className="border-b border-[var(--border)]/60">
                <td className="px-3 py-2">
                  <button
                    type="button"
                    onClick={() => setActionStudent({ id: s.id, name: s.name })}
                    className="text-sky-400 hover:underline text-left"
                  >
                    {s.name}
                  </button>
                </td>
                {isSchoolTenant ? <td className="px-3 py-2 text-xs text-slate-400">{s.admissionNo || "—"}</td> : null}
                {isSchoolTenant ? <td className="px-3 py-2 text-xs capitalize text-slate-400">{s.sex || "—"}</td> : null}
                <td className="px-3 py-2 text-xs">
                  {s.organizationSlug ? (
                    <button
                      type="button"
                      onClick={() => setSchoolSlug(s.organizationSlug!)}
                      className="text-left text-sky-400 hover:underline"
                    >
                      <span className="font-medium">{s.organizationName ?? s.organizationSlug}</span>
                      {isMaster ? (
                        <span className="ml-1 font-mono text-cyan-200/80">({s.organizationSlug})</span>
                      ) : null}
                    </button>
                  ) : (
                    <span className="text-slate-400">{s.organizationName ?? "—"}</span>
                  )}
                </td>
                <td className="px-3 py-2">
                  {s.schoolClassCode && s.schoolStreamCode ? (
                    <>
                      {s.schoolClassCode}/{s.schoolStreamCode}{" "}
                      <span className="text-slate-500">({s.programmeCode})</span>
                    </>
                  ) : (
                    s.programmeCode
                  )}{" "}
                  Yr{s.year} {periodLabel.slice(0, 1)}
                  {s.semester}
                </td>
                <td className="px-3 py-2 text-slate-400">{s.email || "—"}</td>
                <td className="px-3 py-2 text-slate-400">{s.phone || "—"}</td>
                {isSchoolTenant ? (
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => setActionStudent({ id: s.id, name: s.name })}
                      className="text-xs font-semibold text-violet-300 hover:underline"
                    >
                      Actions
                    </button>
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {isSchoolTenant ? (
        <p className="text-sm text-slate-400">No. of students: {rows.length}</p>
      ) : null}
      <SchoolDetailModal
        organizationSlug={schoolSlug}
        open={Boolean(schoolSlug)}
        isMaster={isMaster}
        onClose={() => setSchoolSlug(null)}
      />
      {payBillStudent ? (
        <SchoolPayBillModal
          studentId={payBillStudent.id}
          studentName={payBillStudent.name}
          open
          onClose={() => setPayBillStudent(null)}
          onPaid={() => void load(q)}
        />
      ) : null}
      {billStudent ? (
        <SchoolBillStudentModal
          studentId={billStudent.id}
          studentName={billStudent.name}
          open
          onClose={() => setBillStudent(null)}
          onAssigned={() => void load(q)}
        />
      ) : null}
      {actionStudent ? (
        <SchoolStudentActionSheet
          studentId={actionStudent.id}
          studentName={actionStudent.name}
          open
          onClose={() => setActionStudent(null)}
          onAssignBill={() => {
            setBillStudent(actionStudent);
            setActionStudent(null);
          }}
          onPayBill={() => {
            setPayBillStudent(actionStudent);
            setActionStudent(null);
          }}
          onEdit={() => {
            setEditStudentId(actionStudent.id);
            setActionStudent(null);
          }}
          onDelete={() => {
            if (!confirm(`Delete ${actionStudent.name}?`)) return;
            void fetch(`/api/students/${actionStudent.id}`, { method: "DELETE", credentials: "include" }).then(() => {
              setActionStudent(null);
              void load(q);
            });
          }}
        />
      ) : null}
      {editStudentId ? (
        <SchoolStudentEditModal
          studentId={editStudentId}
          open
          onClose={() => setEditStudentId(null)}
          onSaved={() => void load(q)}
        />
      ) : null}
      <SchoolStudentImportModal open={importOpen} onClose={() => setImportOpen(false)} onDone={() => void load(q)} />
    </div>
  );
}
