"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSchoolAdminApi } from "@/hooks/useSchoolAdminApi";

type CheckItem = { id: string; label: string; ok: boolean; href?: string; detail?: string };

function GoLiveInner() {
  const { schoolFetch, needsOrgSlug, hrefWithOrgSlug, organizationSlug } = useSchoolAdminApi();
  const [items, setItems] = useState<CheckItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [orgSlug, setOrgSlug] = useState(organizationSlug ?? "uwais");

  const load = useCallback(async () => {
    if (needsOrgSlug && !organizationSlug) return;
    const [dash, classes, sessions, payCode, ledger] = await Promise.all([
      schoolFetch("/api/admin/school/dashboard"),
      schoolFetch("/api/admin/school/classes"),
      schoolFetch("/api/admin/school/sessions"),
      schoolFetch("/api/admin/school-pay-code"),
      schoolFetch("/api/admin/school/fee-ledger", undefined, { term: 2 }),
    ]);

    const dashJ = await dash.json().catch(() => ({}));
    const clsJ = await classes.json().catch(() => ({}));
    const sessJ = await sessions.json().catch(() => ({}));
    const codeJ = await payCode.json().catch(() => ({}));
    const ledJ = await ledger.json().catch(() => ({}));

    if (!dash.ok && !classes.ok) {
      setError((dashJ as { error?: string }).error ?? "Could not load school context");
      return;
    }
    setError(null);

    const studentCount = (dashJ as { dashboard?: { students?: { total?: number } } }).dashboard?.students?.total ?? 0;
    const classCount = ((clsJ as { classes?: unknown[] }).classes ?? []).length;
    const sessionOk = ((sessJ as { sessions?: { isActive?: boolean }[] }).sessions ?? []).some((s) => s.isActive);
    const schoolPayCode = String((codeJ as { schoolPayCode?: string }).schoolPayCode ?? "");
    const ledgerCount = ((ledJ as { rows?: unknown[] }).rows ?? []).length;
    const slug = organizationSlug || orgSlug || "uwais";
    setOrgSlug(slug);

    setItems([
      {
        id: "session",
        label: "Active academic session",
        ok: sessionOk,
        href: hrefWithOrgSlug("/admin/school-session"),
        detail: sessionOk ? "Session activated" : "Activate a session",
      },
      {
        id: "classes",
        label: "Classes registered",
        ok: classCount > 0,
        href: hrefWithOrgSlug("/admin/school-structure"),
        detail: `${classCount} class(es)`,
      },
      {
        id: "students",
        label: "Students enrolled",
        ok: studentCount > 0,
        href: hrefWithOrgSlug("/admin/students"),
        detail: `${studentCount} student(s)`,
      },
      {
        id: "ledger",
        label: "Fee ledger rows for term",
        ok: ledgerCount > 0,
        href: hrefWithOrgSlug("/admin/fee-ledger"),
        detail: `${ledgerCount} ledger row(s) — import CSV if empty`,
      },
      {
        id: "paycode",
        label: "School Pay Code",
        ok: /^\d{6}$/.test(schoolPayCode),
        href: hrefWithOrgSlug("/admin/students"),
        detail: schoolPayCode || "Generate under Students / bills",
      },
      {
        id: "checkout",
        label: "Online checkout URL",
        ok: true,
        href: `/pay/${slug}`,
        detail: `/pay/${slug}`,
      },
      {
        id: "parent",
        label: "Parent balance lookup",
        ok: true,
        href: "/parent",
        detail: "Parents use School Code + admission number",
      },
      {
        id: "feeheads",
        label: "Fee structure heads",
        ok: true,
        href: hrefWithOrgSlug("/admin/fee-structure"),
        detail: "Confirm Tuition / Feeding / Qur'an heads",
      },
    ]);
  }, [needsOrgSlug, organizationSlug, orgSlug, schoolFetch, hrefWithOrgSlug]);

  useEffect(() => {
    void load();
  }, [load]);

  const ready = items.length > 0 && items.every((i) => i.ok);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">School go-live checklist</h1>
        <p className="text-sm text-slate-400">
          Confirm the school can stop using spreadsheets. Designed for Uwais and any OdelPay Schools tenant.
        </p>
      </div>
      {needsOrgSlug ? <p className="text-sm text-amber-300">Master: set org slug (e.g. uwais) in the workspace bar.</p> : null}
      {error ? <p className="text-sm text-rose-400">{error}</p> : null}
      <p className={`text-sm font-semibold ${ready ? "text-emerald-300" : "text-amber-300"}`}>
        {ready ? "Ready for go-live" : "Complete the items below"}
      </p>
      <ul className="space-y-2">
        {items.map((i) => (
          <li
            key={i.id}
            className={`flex flex-wrap items-center justify-between gap-2 rounded-xl border px-4 py-3 text-sm ${
              i.ok ? "border-emerald-500/25 bg-emerald-950/20" : "border-amber-500/25 bg-amber-950/20"
            }`}
          >
            <div>
              <p className="font-medium text-white">
                {i.ok ? "✓" : "○"} {i.label}
              </p>
              {i.detail ? <p className="text-xs text-slate-400">{i.detail}</p> : null}
            </div>
            {i.href ? (
              <Link href={i.href} className="text-xs text-cyan-300 hover:underline">
                Open →
              </Link>
            ) : null}
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={() => void load()}
        className="rounded-lg border border-white/15 px-3 py-2 text-sm text-slate-300 hover:bg-white/5"
      >
        Refresh checklist
      </button>
    </div>
  );
}

export default function SchoolGoLivePage() {
  return (
    <Suspense fallback={<p className="text-sm text-slate-400">Loading checklist…</p>}>
      <GoLiveInner />
    </Suspense>
  );
}
