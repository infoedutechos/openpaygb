"use client";

import { useEffect, useMemo, useState } from "react";
import { SchoolReportPreview } from "@/components/admin/school/SchoolReportPreview";
import { useSchoolAdminApi } from "@/hooks/useSchoolAdminApi";

const REPORT_TILES = [
  { id: "cash-flow", title: "Cash flow statement", section: "Financial metric", supportsDateRange: true },
  { id: "profit-loss", title: "Profit and loss (inventory)", section: "Financial metric", supportsDateRange: true },
  { id: "class-bills", title: "Class bills summary", section: "Records", supportsDateRange: false },
  { id: "student-account", title: "Student account statement", section: "Records", supportsDateRange: false },
  { id: "payroll", title: "Payroll", section: "Records", supportsDateRange: false },
  { id: "bill-account", title: "Bill account statement", section: "Records", supportsDateRange: false },
  { id: "expense-account", title: "Expense account statement", section: "Records", supportsDateRange: true },
  { id: "inventory-account", title: "Inventory account statement", section: "Records", supportsDateRange: false },
] as const;

type Account = { id: string; name: string; kind: string };

export default function SchoolReportsPage() {
  const { schoolFetch, schoolUrl, needsOrgSlug } = useSchoolAdminApi();
  const [active, setActive] = useState<string | null>(null);
  const [periodMode, setPeriodMode] = useState<"term" | "range">("term");
  const [term, setTerm] = useState(1);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [classId, setClassId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [monthKey, setMonthKey] = useState(() => new Date().toISOString().slice(0, 7));
  const [schoolAccountId, setSchoolAccountId] = useState("");
  const [expenseAccountId, setExpenseAccountId] = useState("");
  const [classes, setClasses] = useState<{ id: string; code: string }[]>([]);
  const [students, setStudents] = useState<{ id: string; name: string }[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [result, setResult] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);

  const activeTile = REPORT_TILES.find((t) => t.id === active);

  useEffect(() => {
    if (needsOrgSlug) return;
    void schoolFetch("/api/admin/school/sessions")
      .then((r) => r.json())
      .then((j) => {
        if (j.context?.activeTerm) setTerm(j.context.activeTerm);
      });
  }, [needsOrgSlug, schoolFetch]);

  useEffect(() => {
    if (needsOrgSlug) return;
    void Promise.all([
      schoolFetch("/api/admin/school/classes"),
      fetch("/api/students?limit=300", { credentials: "include" }).then((r) => r.json()),
      schoolFetch("/api/admin/school/accounts"),
    ]).then(([clsR, stuJ, accR]) => {
      clsR.json().then((clsJ) => setClasses((clsJ.classes ?? []).map((c: { id: string; code: string }) => ({ id: c.id, code: c.code }))));
      setStudents(((stuJ.students ?? []) as { id: string; name: string }[]).map((s) => ({ id: s.id, name: s.name })));
      accR.json().then((accJ) => setAccounts(accJ.accounts ?? []));
    });
  }, [needsOrgSlug, schoolFetch]);

  const incomeAccounts = useMemo(() => accounts.filter((a) => a.kind === "income"), [accounts]);
  const expenditureAccounts = useMemo(() => accounts.filter((a) => a.kind === "expenditure"), [accounts]);

  function buildQuery(extra?: Record<string, string>): string {
    const params = new URLSearchParams({ report: active ?? "", ...extra });
    if (periodMode === "term" && active !== "payroll" && active !== "inventory-account") {
      params.set("term", String(term));
    }
    if (periodMode === "range" && from) params.set("from", from);
    if (periodMode === "range" && to) params.set("to", to);
    if (active === "class-bills" && classId) params.set("classId", classId);
    if (active === "student-account" && studentId) params.set("studentId", studentId);
    if (active === "payroll") params.set("monthKey", monthKey);
    if (active === "bill-account" && schoolAccountId) params.set("schoolAccountId", schoolAccountId);
    if (active === "expense-account" && expenseAccountId) params.set("accountId", expenseAccountId);
    return params.toString();
  }

  async function generate() {
    if (!active) return;
    setError(null);
    const r = await fetch(schoolUrl("/api/admin/school/reports", Object.fromEntries(new URLSearchParams(buildQuery())) as Record<string, string>), { credentials: "include" });
    const j = await r.json();
    if (!r.ok) {
      setError(j.error ?? "Report failed");
      setResult(null);
      return;
    }
    setResult(j);
  }

  function exportReport(format: "csv" | "pdf") {
    window.location.href = schoolUrl("/api/admin/school/reports/export", { ...Object.fromEntries(new URLSearchParams(buildQuery())), format });
  }

  return (
    <div className="space-y-6 print:space-y-4">
      <div className="print:hidden">
        <h1 className="text-2xl font-semibold text-white">Reports</h1>
        <p className="text-sm text-slate-400">Financial metric and records statements.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 print:hidden">
        {REPORT_TILES.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              setActive(t.id);
              setResult(null);
              setError(null);
            }}
            className={`rounded-2xl border p-6 text-left ${active === t.id ? "border-cyan-400/40 bg-cyan-950/30" : "border-white/10 bg-[#0a101f]"}`}
          >
            <p className="text-[10px] uppercase text-slate-500">{t.section}</p>
            <p className="mt-1 text-sm font-semibold text-white">{t.title}</p>
          </button>
        ))}
      </div>
      {active ? (
        <div className="rounded-xl border border-white/10 bg-[#0a101f] p-4 space-y-3 print:border-0 print:bg-white print:text-black">
          <div className="flex flex-wrap gap-3 print:hidden">
            {activeTile?.supportsDateRange ? (
              <div className="flex gap-2 rounded-lg border border-white/10 p-1">
                {(["term", "range"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setPeriodMode(m)}
                    className={`rounded px-3 py-1 text-xs ${periodMode === m ? "bg-violet-700 text-white" : "text-slate-400"}`}
                  >
                    {m === "term" ? "Term" : "Date range"}
                  </button>
                ))}
              </div>
            ) : null}
            {periodMode === "term" && active !== "inventory-account" && active !== "payroll" ? (
              <label className="flex items-center gap-2 text-sm text-slate-300">
                Term
                <select
                  value={term}
                  onChange={(e) => setTerm(Number(e.target.value))}
                  className="rounded-lg border border-white/15 bg-black/30 px-2 py-1 text-white"
                >
                  <option value={1}>Term 1</option>
                  <option value={2}>Term 2</option>
                  <option value={3}>Term 3</option>
                </select>
              </label>
            ) : null}
            {periodMode === "range" && activeTile?.supportsDateRange ? (
              <>
                <label className="flex items-center gap-2 text-sm text-slate-300">
                  From
                  <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-lg border border-white/15 bg-black/30 px-2 py-1 text-white" />
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-300">
                  To
                  <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded-lg border border-white/15 bg-black/30 px-2 py-1 text-white" />
                </label>
              </>
            ) : null}
            {active === "payroll" ? (
              <label className="flex items-center gap-2 text-sm text-slate-300">
                Month
                <input type="month" value={monthKey} onChange={(e) => setMonthKey(e.target.value)} className="rounded-lg border border-white/15 bg-black/30 px-2 py-1 text-white" />
              </label>
            ) : null}
            {active === "class-bills" ? (
              <select value={classId} onChange={(e) => setClassId(e.target.value)} className="rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-white">
                <option value="">Select class</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>{c.code}</option>
                ))}
              </select>
            ) : null}
            {active === "student-account" ? (
              <select value={studentId} onChange={(e) => setStudentId(e.target.value)} className="rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-white">
                <option value="">Select student</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            ) : null}
            {active === "bill-account" ? (
              <select value={schoolAccountId} onChange={(e) => setSchoolAccountId(e.target.value)} className="rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-white">
                <option value="">All income accounts</option>
                {incomeAccounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            ) : null}
            {active === "expense-account" ? (
              <select value={expenseAccountId} onChange={(e) => setExpenseAccountId(e.target.value)} className="rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-white">
                <option value="">All expenditure accounts</option>
                {expenditureAccounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            ) : null}
            <button type="button" onClick={() => void generate()} className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white">
              Generate
            </button>
            {result ? (
              <>
                <button type="button" onClick={() => window.print()} className="rounded-lg border border-white/15 px-4 py-2 text-sm text-slate-300">
                  Print
                </button>
                <button type="button" onClick={() => exportReport("csv")} className="rounded-lg border border-cyan-500/30 px-4 py-2 text-sm text-cyan-300">
                  Export CSV
                </button>
                <button type="button" onClick={() => exportReport("pdf")} className="rounded-lg border border-emerald-500/30 px-4 py-2 text-sm text-emerald-300">
                  Export PDF
                </button>
              </>
            ) : null}
          </div>
          {error ? <p className="text-sm text-rose-400 print:hidden">{error}</p> : null}
          {result ? <SchoolReportPreview reportId={active} data={result} /> : null}
        </div>
      ) : null}
    </div>
  );
}
