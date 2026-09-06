"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { SchoolReportPreview } from "@/components/admin/school/SchoolReportPreview";
import { SchoolTermSelect } from "@/components/admin/school/SchoolTermSelect";
import { useSchoolAdminApi } from "@/hooks/useSchoolAdminApi";

const REPORT_TILES = [
  { id: "cash-flow", title: "Cash flow statement", section: "Financial metric", supportsDateRange: true, needsClass: false, needsStudent: false },
  { id: "profit-loss", title: "Profit and loss (inventory)", section: "Financial metric", supportsDateRange: true, needsClass: false, needsStudent: false },
  { id: "class-bills", title: "Class bills summary", section: "Records", supportsDateRange: false, needsClass: true, needsStudent: false },
  { id: "student-account", title: "Student account statement", section: "Records", supportsDateRange: false, needsClass: false, needsStudent: true },
  { id: "payroll", title: "Payroll", section: "Records", supportsDateRange: false, needsClass: false, needsStudent: false },
  { id: "bill-account", title: "Bill account statement", section: "Records", supportsDateRange: false, needsClass: false, needsStudent: false },
  { id: "expense-account", title: "Expense account statement", section: "Records", supportsDateRange: true, needsClass: false, needsStudent: false },
  { id: "inventory-account", title: "Inventory account statement", section: "Records", supportsDateRange: false, needsClass: false, needsStudent: false },
] as const;

type ReportId = (typeof REPORT_TILES)[number]["id"];
type Account = { id: string; name: string; kind: string };

export default function SchoolReportsPage() {
  const { schoolFetch, schoolUrl, needsOrgSlug } = useSchoolAdminApi();
  const [active, setActive] = useState<ReportId | null>(null);
  const [periodMode, setPeriodMode] = useState<"term" | "range">("term");
  const [term, setTerm] = useState(1);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [classId, setClassId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [studentQ, setStudentQ] = useState("");
  const [monthKey, setMonthKey] = useState(() => new Date().toISOString().slice(0, 7));
  const [schoolAccountId, setSchoolAccountId] = useState("");
  const [expenseAccountId, setExpenseAccountId] = useState("");
  const [classes, setClasses] = useState<{ id: string; code: string; name: string }[]>([]);
  const [students, setStudents] = useState<{ id: string; name: string; admissionNo?: string }[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [result, setResult] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const activeTile = REPORT_TILES.find((t) => t.id === active);

  useEffect(() => {
    if (needsOrgSlug) return;
    void schoolFetch("/api/admin/school/sessions")
      .then((r) => r.json())
      .then((j: { context?: { activeTerm?: number } }) => {
        if (j.context?.activeTerm) setTerm(j.context.activeTerm);
      });
  }, [needsOrgSlug, schoolFetch]);

  useEffect(() => {
    if (needsOrgSlug) return;
    void (async () => {
      const [clsR, stuR, accR] = await Promise.all([
        schoolFetch("/api/admin/school/classes", undefined, { allSessions: "1" }),
        schoolFetch("/api/students", undefined, { limit: 500 }),
        schoolFetch("/api/admin/school/accounts"),
      ]);
      if (clsR.ok) {
        const clsJ = (await clsR.json()) as {
          classes?: { id: string; code: string; name: string }[];
        };
        setClasses(
          (clsJ.classes ?? []).map((c) => ({ id: c.id, code: c.code, name: c.name })),
        );
      }
      if (stuR.ok) {
        const stuJ = (await stuR.json()) as {
          students?: { id: string; name: string; admissionNo?: string }[];
        };
        setStudents(
          (stuJ.students ?? []).map((s) => ({
            id: s.id,
            name: s.name,
            admissionNo: s.admissionNo,
          })),
        );
      }
      if (accR.ok) {
        const accJ = (await accR.json()) as { accounts?: Account[] };
        setAccounts(accJ.accounts ?? []);
      }
    })();
  }, [needsOrgSlug, schoolFetch]);

  const incomeAccounts = useMemo(() => accounts.filter((a) => a.kind === "income"), [accounts]);
  const expenditureAccounts = useMemo(
    () => accounts.filter((a) => a.kind === "expenditure"),
    [accounts],
  );

  const filteredStudents = useMemo(() => {
    const q = studentQ.trim().toLowerCase();
    if (!q) return students;
    return students.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.admissionNo ?? "").toLowerCase().includes(q),
    );
  }, [students, studentQ]);

  const buildQuery = useCallback(
    (extra?: Record<string, string>): string => {
      const params = new URLSearchParams({ report: active ?? "", ...extra });
      if (periodMode === "term" && active !== "payroll" && active !== "inventory-account") {
        params.set("term", String(term));
      }
      if (periodMode === "range" && from) params.set("from", from);
      if (periodMode === "range" && to) params.set("to", to);
      if (active === "class-bills" && classId) params.set("classId", classId);
      if (active === "student-account" && studentId) params.set("studentId", studentId);
      if (active === "payroll") params.set("monthKey", monthKey);
      if (active === "bill-account" && schoolAccountId) {
        params.set("schoolAccountId", schoolAccountId);
      }
      if (active === "expense-account" && expenseAccountId) {
        params.set("accountId", expenseAccountId);
      }
      return params.toString();
    },
    [
      active,
      periodMode,
      term,
      from,
      to,
      classId,
      studentId,
      monthKey,
      schoolAccountId,
      expenseAccountId,
    ],
  );

  const generate = useCallback(async () => {
    if (!active || !activeTile) return;
    setError(null);
    setStatus(null);

    if (activeTile.needsClass && !classId) {
      setError("Select a class to generate Class bills summary.");
      setResult(null);
      return;
    }
    if (activeTile.needsStudent && !studentId) {
      setError("Select a student to generate Student account statement.");
      setResult(null);
      return;
    }
    if (periodMode === "range" && activeTile.supportsDateRange) {
      if (!from || !to) {
        setError("Choose both From and To dates.");
        setResult(null);
        return;
      }
      if (from > to) {
        setError("From date must be on or before To date.");
        setResult(null);
        return;
      }
    }

    setBusy(true);
    try {
      const r = await fetch(
        schoolUrl(
          "/api/admin/school/reports",
          Object.fromEntries(new URLSearchParams(buildQuery())) as Record<string, string>,
        ),
        { credentials: "include" },
      );
      const j = await r.json();
      if (!r.ok) {
        setError(j.error ?? "Report failed");
        setResult(null);
        return;
      }
      setResult(j);
      setStatus(`Generated · ${activeTile.title}`);
    } catch {
      setError("Report request failed");
      setResult(null);
    } finally {
      setBusy(false);
    }
  }, [active, activeTile, classId, studentId, periodMode, from, to, schoolUrl, buildQuery]);

  /** Auto-run reports that need no extra picker (or when pickers already set). */
  useEffect(() => {
    if (!active || !activeTile || needsOrgSlug) return;
    if (activeTile.needsClass && !classId) {
      setResult(null);
      return;
    }
    if (activeTile.needsStudent && !studentId) {
      setResult(null);
      return;
    }
    const t = setTimeout(() => void generate(), 200);
    return () => clearTimeout(t);
    // Intentionally re-run when filters change for the active report.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- generate closes over filters
  }, [
    active,
    term,
    periodMode,
    from,
    to,
    classId,
    studentId,
    monthKey,
    schoolAccountId,
    expenseAccountId,
    needsOrgSlug,
  ]);

  function exportReport(format: "csv" | "pdf") {
    window.location.href = schoolUrl("/api/admin/school/reports/export", {
      ...Object.fromEntries(new URLSearchParams(buildQuery())),
      format,
    });
  }

  const bySection = useMemo(() => {
    const map = new Map<string, typeof REPORT_TILES[number][]>();
    for (const t of REPORT_TILES) {
      const list = map.get(t.section) ?? [];
      list.push(t);
      map.set(t.section, list);
    }
    return [...map.entries()];
  }, []);

  if (needsOrgSlug) {
    return (
      <div className="space-y-3">
        <h1 className="text-2xl font-semibold text-white">Reports</h1>
        <p className="text-sm text-amber-200">Master: set an organization slug to run school reports.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 print:space-y-4">
      <div className="print:hidden">
        <h1 className="text-2xl font-semibold text-white">Reports</h1>
        <p className="text-sm text-slate-400">
          Financial metrics and records — cash flow, P&amp;L, bills, payroll (staff salary export), accounts, and
          inventory. Payroll here is a report, not a full PayRollMS sidebar module.
        </p>
      </div>

      {bySection.map(([section, tiles]) => (
        <div key={section} className="space-y-2 print:hidden">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{section}</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {tiles.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setActive(t.id);
                  if (!t.supportsDateRange) setPeriodMode("term");
                  setError(null);
                  setStatus(null);
                }}
                className={`rounded-2xl border p-5 text-left transition ${
                  active === t.id
                    ? "border-cyan-400/50 bg-cyan-950/40 ring-1 ring-cyan-400/30"
                    : "border-white/10 bg-[#0a101f] hover:border-cyan-500/25"
                }`}
              >
                <p className="text-[10px] uppercase text-slate-500">{t.section}</p>
                <p className="mt-1 text-sm font-semibold text-white">{t.title}</p>
                <p className="mt-2 text-[10px] text-emerald-400/90">
                  {active === t.id && busy ? "Generating…" : active === t.id ? "Active" : "Ready"}
                </p>
              </button>
            ))}
          </div>
        </div>
      ))}

      {active && activeTile ? (
        <div className="rounded-xl border border-white/10 bg-[#0a101f] p-4 space-y-3 print:border-0 print:bg-white print:text-black">
          <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
            <h2 className="text-base font-semibold text-white">{activeTile.title}</h2>
            {status ? <p className="text-xs text-emerald-300">{status}</p> : null}
          </div>
          <div className="flex flex-wrap gap-3 print:hidden">
            {activeTile.supportsDateRange ? (
              <div className="flex gap-2 rounded-lg border border-white/10 p-1">
                {(["term", "range"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setPeriodMode(m)}
                    className={`rounded px-3 py-1 text-xs ${
                      periodMode === m ? "bg-violet-700 text-white" : "text-slate-400"
                    }`}
                  >
                    {m === "term" ? "Term" : "Date range"}
                  </button>
                ))}
              </div>
            ) : null}
            {periodMode === "term" && active !== "inventory-account" && active !== "payroll" ? (
              <SchoolTermSelect
                value={term}
                onChange={(n) => setTerm(n)}
                className="text-xs text-slate-300"
              />
            ) : null}
            {periodMode === "range" && activeTile.supportsDateRange ? (
              <>
                <label className="flex items-center gap-2 text-sm text-slate-300">
                  From
                  <input
                    type="date"
                    value={from}
                    onChange={(e) => setFrom(e.target.value)}
                    className="rounded-lg border border-white/15 bg-black/30 px-2 py-1 text-white"
                  />
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-300">
                  To
                  <input
                    type="date"
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                    className="rounded-lg border border-white/15 bg-black/30 px-2 py-1 text-white"
                  />
                </label>
              </>
            ) : null}
            {active === "payroll" ? (
              <label className="flex items-center gap-2 text-sm text-slate-300">
                Month
                <input
                  type="month"
                  value={monthKey}
                  onChange={(e) => setMonthKey(e.target.value)}
                  className="rounded-lg border border-white/15 bg-black/30 px-2 py-1 text-white"
                />
              </label>
            ) : null}
            {active === "class-bills" ? (
              <select
                value={classId}
                onChange={(e) => setClassId(e.target.value)}
                className="rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-white"
              >
                <option value="">Select class</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} — {c.name}
                  </option>
                ))}
              </select>
            ) : null}
            {active === "student-account" ? (
              <div className="flex flex-wrap gap-2">
                <input
                  value={studentQ}
                  onChange={(e) => setStudentQ(e.target.value)}
                  placeholder="Search student…"
                  className="rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white"
                />
                <select
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  className="min-w-[12rem] rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-white"
                >
                  <option value="">Select student</option>
                  {filteredStudents.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                      {s.admissionNo ? ` (${s.admissionNo})` : ""}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            {active === "bill-account" ? (
              <select
                value={schoolAccountId}
                onChange={(e) => setSchoolAccountId(e.target.value)}
                className="rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-white"
              >
                <option value="">All income accounts</option>
                {incomeAccounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            ) : null}
            {active === "expense-account" ? (
              <select
                value={expenseAccountId}
                onChange={(e) => setExpenseAccountId(e.target.value)}
                className="rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-white"
              >
                <option value="">All expenditure accounts</option>
                {expenditureAccounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            ) : null}
            <button
              type="button"
              disabled={busy}
              onClick={() => void generate()}
              className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {busy ? "Generating…" : "Generate"}
            </button>
            {result ? (
              <>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="rounded-lg border border-white/15 px-4 py-2 text-sm text-slate-300"
                >
                  Print
                </button>
                <button
                  type="button"
                  onClick={() => exportReport("csv")}
                  className="rounded-lg border border-cyan-500/30 px-4 py-2 text-sm text-cyan-300"
                >
                  Export CSV
                </button>
                <button
                  type="button"
                  onClick={() => exportReport("pdf")}
                  className="rounded-lg border border-emerald-500/30 px-4 py-2 text-sm text-emerald-300"
                >
                  Export PDF
                </button>
              </>
            ) : null}
          </div>
          {error ? <p className="text-sm text-rose-400 print:hidden">{error}</p> : null}
          {result ? <SchoolReportPreview reportId={active} data={result} /> : null}
          {!result && !error && !busy && activeTile.needsClass && !classId ? (
            <p className="text-sm text-slate-500">Select a class above to load this report.</p>
          ) : null}
          {!result && !error && !busy && activeTile.needsStudent && !studentId ? (
            <p className="text-sm text-slate-500">Select a student above to load this report.</p>
          ) : null}
        </div>
      ) : (
        <p className="text-sm text-slate-500 print:hidden">Select a report tile to generate it.</p>
      )}
    </div>
  );
}
