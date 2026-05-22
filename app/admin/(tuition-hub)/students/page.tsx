"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { SchoolDetailModal } from "@/components/admin/SchoolDetailModal";
import { TuitionHubCheckoutExplainerCompact } from "@/components/admin/TuitionHubCheckoutExplainer";
import { TenantList } from "@/components/tuition/TenantList";
import { useTuitionAdminGate } from "@/hooks/useTuitionAdminGate";

type StudentRow = {
  id: string;
  name: string;
  email: string;
  phone: string;
  telegramId: string;
  programmeCode: string;
  year: number;
  semester: number;
  createdAt: string;
  organizationSlug?: string;
  organizationName?: string;
};

export default function AdminStudentsPage() {
  const { loading: authLoading, ensureTuitionSession } = useTuitionAdminGate();
  const [q, setQ] = useState("");
  const [organizationSlugFilter, setOrganizationSlugFilter] = useState("");
  const [rows, setRows] = useState<StudentRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isMaster, setIsMaster] = useState(false);
  const [schoolSlug, setSchoolSlug] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createBusy, setCreateBusy] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "",
    email: "",
    phone: "",
    programmeCode: "",
    year: 1,
    semester: 1,
    password: "",
  });

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
    [authLoading, ensureTuitionSession, organizationSlugFilter]
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
        <h1 className="text-2xl font-semibold text-white">Students</h1>
        <p className="text-sm text-slate-400">
          Search by name, email, or phone.
          {isMaster ? " As platform master you see records for every tenant; optionally filter by school slug." : null}{" "}
          Programme / year / semester are the student&apos;s current enrollment context; actual fee lines and totals for
          each payment are built at checkout from your programme schedules.
        </p>
        <TuitionHubCheckoutExplainerCompact className="mt-2 max-w-3xl" />
      </div>
      {error && <p className="text-sm text-rose-400">{error}</p>}
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
                      email: createForm.email.trim() || undefined,
                      phone: createForm.phone.trim(),
                      programmeCode: createForm.programmeCode.trim(),
                      year: createForm.year,
                      semester: createForm.semester,
                      ...(createForm.email.trim() && createForm.password.trim().length >= 10
                        ? { portalPassword: createForm.password.trim() }
                        : {}),
                    }),
                  });
                  const j = (await r.json()) as { student?: { id: string }; error?: string; details?: unknown };
                  if (!r.ok) {
                    const detail =
                      j.details && typeof j.details === "object"
                        ? JSON.stringify(j.details)
                        : "";
                    throw new Error(j.error ? `${j.error}${detail ? ` (${detail})` : ""}` : "Create failed");
                  }
                  setCreateForm({
                    name: "",
                    email: "",
                    phone: "",
                    programmeCode: "",
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
            <input
              type="email"
              placeholder="Email (required for portal login)"
              value={createForm.email}
              onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
              className="rounded-md border border-[var(--border)] bg-[#0d1526] px-3 py-2 text-sm text-white"
            />
            <input
              placeholder="Programme code"
              required
              value={createForm.programmeCode}
              onChange={(e) => setCreateForm((f) => ({ ...f, programmeCode: e.target.value }))}
              className="rounded-md border border-[var(--border)] bg-[#0d1526] px-3 py-2 text-sm text-white"
            />
            <input
              placeholder="Portal password (min 10 chars, required if email set)"
              value={createForm.password}
              required={Boolean(createForm.email.trim())}
              minLength={createForm.email.trim() ? 10 : undefined}
              onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))}
              className="rounded-md border border-[var(--border)] bg-[#0d1526] px-3 py-2 text-sm text-white"
            />
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
                  Semester {s}
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={createBusy}
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
              {s.programmeCode} · Yr{s.year} Sem{s.semester}
            </p>
            {isMaster && s.organizationSlug ? (
              <p className="mt-1 text-xs text-slate-500">
                {s.organizationName ?? s.organizationSlug}
                <span className="ml-1 font-mono text-cyan-200/80">({s.organizationSlug})</span>
              </p>
            ) : null}
            <p className="mt-2 truncate text-xs text-slate-500">{s.email || s.phone || "—"}</p>
          </Link>
        ))}
      </div>
      <div className="hidden overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--card)] md:block">
        <table className="min-w-full text-left text-sm text-slate-200">
          <thead className="border-b border-[var(--border)] text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">School</th>
              <th className="px-3 py-2">Programme</th>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Phone</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s.id} className="border-b border-[var(--border)]/60">
                <td className="px-3 py-2">
                  <Link href={`/admin/students/${s.id}`} className="text-sky-400 hover:underline">
                    {s.name}
                  </Link>
                </td>
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
                  {s.programmeCode} Yr{s.year} Sem{s.semester}
                </td>
                <td className="px-3 py-2 text-slate-400">{s.email || "—"}</td>
                <td className="px-3 py-2 text-slate-400">{s.phone || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <SchoolDetailModal
        organizationSlug={schoolSlug}
        open={Boolean(schoolSlug)}
        isMaster={isMaster}
        onClose={() => setSchoolSlug(null)}
      />
    </div>
  );
}
