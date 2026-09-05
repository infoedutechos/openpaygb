"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { SchoolBillStudentModal } from "@/components/admin/school/SchoolBillStudentModal";
import { SchoolPayBillModal } from "@/components/admin/school/SchoolPayBillModal";
import { SchoolStudentActionSheet } from "@/components/admin/school/SchoolStudentActionSheet";
import { SchoolStudentEditModal } from "@/components/admin/school/SchoolStudentEditModal";
import { SchoolStudentImportModal } from "@/components/admin/school/SchoolStudentImportModal";
import { SchoolStudentsRegisterPanel } from "@/components/admin/school/SchoolStudentsRegisterPanel";
import { useSchoolAdminApi } from "@/hooks/useSchoolAdminApi";
import { useSchoolClassFilter } from "@/hooks/useSchoolClassFilter";
import { useTuitionAdminGate } from "@/hooks/useTuitionAdminGate";

type ClassOption = {
  id: string;
  code: string;
  name: string;
  streams: { id: string; code: string; name: string }[];
};

export default function StudentsRegisterPage() {
  const { schoolScope, schoolFetch, hrefWithOrgSlug } = useSchoolAdminApi();
  const { loading: authLoading, ensureTuitionSession } = useTuitionAdminGate();
  const [classFilter, setClassFilter] = useSchoolClassFilter();
  const [q, setQ] = useState("");
  const [schoolClasses, setSchoolClasses] = useState<ClassOption[]>([]);
  const [importOpen, setImportOpen] = useState(false);
  const [registerKey, setRegisterKey] = useState(0);
  const [payBillStudent, setPayBillStudent] = useState<{ id: string; name: string } | null>(null);
  const [billStudent, setBillStudent] = useState<{ id: string; name: string } | null>(null);
  const [actionStudent, setActionStudent] = useState<{ id: string; name: string } | null>(null);
  const [editStudentId, setEditStudentId] = useState<string | null>(null);
  const [gateError, setGateError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    const gate = ensureTuitionSession({
      message: "Sign in to open the students register.",
    });
    if (!gate.ok && gate.error) setGateError(gate.error);
    else setGateError(null);
  }, [authLoading, ensureTuitionSession]);

  useEffect(() => {
    if (!schoolScope) return;
    void schoolFetch("/api/admin/school/classes", undefined, { allSessions: "1" })
      .then(async (r) => {
        if (!r.ok) return;
        const j = (await r.json()) as { classes?: ClassOption[] };
        setSchoolClasses(j.classes ?? []);
      })
      .catch(() => undefined);
  }, [schoolScope, schoolFetch]);

  const bump = useCallback(() => setRegisterKey((k) => k + 1), []);

  if (!schoolScope && !authLoading) {
    return (
      <div className="space-y-3">
        <h1 className="text-2xl font-semibold text-white">Students Register</h1>
        <p className="text-sm text-amber-200">
          Open a school workspace (or pick an org slug as master) to use the Excel-style register.
        </p>
        <Link href={hrefWithOrgSlug("/admin/students")} className="text-sm text-cyan-300 hover:underline">
          Students / bills →
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Students Register</h1>
        <p className="text-sm text-slate-400">
          Holistic Excel-style roster — demographics, contacts, class/stream, year, and term. Import/export CSV
          matches these columns.
        </p>
        <Link
          href={hrefWithOrgSlug("/admin/students")}
          className="mt-2 inline-block text-xs text-cyan-300 hover:underline"
        >
          ← Students / bills (assign &amp; pay)
        </Link>
      </div>

      {gateError ? <p className="text-sm text-rose-400">{gateError}</p> : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name, admission, phone…"
          className="w-full max-w-md rounded-md border border-[var(--border)] bg-[#0d1526] px-3 py-2 text-sm text-white"
        />
        <select
          value={classFilter}
          onChange={(e) => setClassFilter(e.target.value)}
          className="w-full max-w-xs rounded-md border border-[var(--border)] bg-[#0d1526] px-3 py-2 text-sm text-white"
        >
          <option value="">All classes</option>
          {schoolClasses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.code} — {c.name}
            </option>
          ))}
        </select>
      </div>

      <SchoolStudentsRegisterPanel
        search={q}
        classFilter={classFilter}
        classes={schoolClasses}
        refreshKey={registerKey}
        onImportOpen={() => setImportOpen(true)}
        onOpenActions={(s) => setActionStudent(s)}
      />

      {payBillStudent ? (
        <SchoolPayBillModal
          studentId={payBillStudent.id}
          studentName={payBillStudent.name}
          open
          onClose={() => setPayBillStudent(null)}
          onPaid={bump}
          onAssignBill={() => {
            setBillStudent(payBillStudent);
            setPayBillStudent(null);
          }}
        />
      ) : null}
      {billStudent ? (
        <SchoolBillStudentModal
          studentId={billStudent.id}
          studentName={billStudent.name}
          open
          onClose={() => setBillStudent(null)}
          onAssigned={bump}
        />
      ) : null}
      {actionStudent && !billStudent && !payBillStudent && !editStudentId ? (
        <SchoolStudentActionSheet
          studentId={actionStudent.id}
          studentName={actionStudent.name}
          open
          onClose={() => setActionStudent(null)}
          onAssignBill={() => setBillStudent(actionStudent)}
          onPayBill={() => setPayBillStudent(actionStudent)}
          onEdit={() => setEditStudentId(actionStudent.id)}
          onDelete={async () => {
            await fetch(`/api/students/${actionStudent.id}`, {
              method: "DELETE",
              credentials: "include",
            });
            setActionStudent(null);
            bump();
          }}
        />
      ) : null}
      {editStudentId ? (
        <SchoolStudentEditModal
          studentId={editStudentId}
          open
          onClose={() => setEditStudentId(null)}
          onSaved={bump}
        />
      ) : null}
      <SchoolStudentImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onDone={bump}
      />
    </div>
  );
}
