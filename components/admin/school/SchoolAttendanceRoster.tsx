"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSchoolAdminApi } from "@/hooks/useSchoolAdminApi";
import { clientFetchErrorMessage } from "@/lib/client-fetch-error";
import { SmisModuleShell } from "@/components/admin/school/SmisModuleShell";

type SchoolClassRow = { id: string; code: string; name: string; studentCount: number };
type StudentRow = { id: string; name: string; admissionNo: string };
type Status = "Present" | "Absent" | "Late" | "Excused";

/** Class roster attendance with SMIS persistence + free-form log fallback. */
export function SchoolAttendanceRoster() {
  const { schoolFetch, needsOrgSlug } = useSchoolAdminApi();
  const [classes, setClasses] = useState<SchoolClassRow[]>([]);
  const [classId, setClassId] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [marks, setMarks] = useState<Record<string, Status>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [savedNote, setSavedNote] = useState<string | null>(null);

  const selectedClass = useMemo(() => classes.find((c) => c.id === classId) ?? null, [classes, classId]);

  const loadClasses = useCallback(async () => {
    if (needsOrgSlug) return;
    try {
      const res = await schoolFetch("/api/admin/school/classes");
      if (!res.ok) return;
      const data = (await res.json()) as { classes: SchoolClassRow[] };
      setClasses(data.classes ?? []);
      if (!classId && data.classes?.[0]?.id) setClassId(data.classes[0].id);
    } catch {
      /* ignore */
    }
  }, [classId, needsOrgSlug, schoolFetch]);

  const loadStudents = useCallback(async () => {
    if (needsOrgSlug || !classId) {
      setStudents([]);
      return;
    }
    setError(null);
    try {
      const res = await schoolFetch("/api/students", undefined, {
        schoolClassId: classId,
        limit: "200",
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(typeof j.error === "string" ? j.error : "Could not load students");
      }
      const data = (await res.json()) as {
        students: { id: string; name?: string; admissionNo?: string }[];
      };
      const rows = (data.students ?? []).map((s) => ({
        id: s.id,
        name: s.name || "Student",
        admissionNo: s.admissionNo || "",
      }));
      setStudents(rows);
      setMarks((prev) => {
        const next: Record<string, Status> = {};
        for (const s of rows) next[s.id] = prev[s.id] || "Present";
        return next;
      });
    } catch (e) {
      setError(clientFetchErrorMessage(e));
    }
  }, [classId, needsOrgSlug, schoolFetch]);

  useEffect(() => {
    void loadClasses();
  }, [loadClasses]);

  useEffect(() => {
    void loadStudents();
  }, [loadStudents]);

  async function saveRoll() {
    if (!selectedClass || students.length === 0) return;
    setBusy(true);
    setError(null);
    setSavedNote(null);
    try {
      const present = students.filter((s) => marks[s.id] === "Present").length;
      const absent = students.filter((s) => marks[s.id] === "Absent").length;
      const late = students.filter((s) => marks[s.id] === "Late").length;
      const excused = students.filter((s) => marks[s.id] === "Excused").length;

      const payload = {
        Date: date,
        Class: `${selectedClass.code} — ${selectedClass.name}`,
        schoolClassId: selectedClass.id,
        Student: `${students.length} on roll`,
        "Status (Present/Absent/Late)": `P${present} A${absent} L${late} E${excused}`,
        roll: students.map((s) => ({
          studentId: s.id,
          admissionNo: s.admissionNo,
          name: s.name,
          status: marks[s.id] || "Present",
        })),
      };

      const res = await schoolFetch("/api/admin/school/smis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ module: "attendance", payload }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof j.error === "string" ? j.error : "Save failed");
      setSavedNote(
        `Saved ${date}: ${present} present, ${absent} absent, ${late} late, ${excused} excused.`,
      );
    } catch (e) {
      setError(clientFetchErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  function markAll(status: Status) {
    setMarks(Object.fromEntries(students.map((s) => [s.id, status])));
  }

  return (
    <div className="space-y-8">
      <section className="space-y-4 rounded-xl border border-white/10 bg-[#0c1424]/60 p-4">
        <div>
          <h2 className="text-lg font-semibold text-white">Class roll</h2>
          <p className="mt-1 text-sm text-slate-400">
            Pick a class and date, mark the roster, then save. Rows also appear in the attendance log below.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <label className="text-xs text-slate-400">
            Date
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1 block rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
            />
          </label>
          <label className="text-xs text-slate-400">
            Class
            <select
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
              className="mt-1 block min-w-[12rem] rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
            >
              <option value="">Select class</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} — {c.name} ({c.studentCount})
                </option>
              ))}
            </select>
          </label>
          <div className="flex flex-wrap items-end gap-2">
            <button
              type="button"
              onClick={() => markAll("Present")}
              className="rounded-lg border border-emerald-500/30 px-3 py-2 text-xs text-emerald-200"
            >
              All present
            </button>
            <button
              type="button"
              onClick={() => markAll("Absent")}
              className="rounded-lg border border-rose-500/30 px-3 py-2 text-xs text-rose-200"
            >
              All absent
            </button>
            <button
              type="button"
              disabled={busy || students.length === 0}
              onClick={() => void saveRoll()}
              className="rounded-lg bg-cyan-600 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
            >
              {busy ? "Saving…" : "Save roll"}
            </button>
          </div>
        </div>

        {error ? <p className="text-sm text-rose-300">{error}</p> : null}
        {savedNote ? <p className="text-sm text-emerald-300">{savedNote}</p> : null}

        {students.length === 0 ? (
          <p className="text-sm text-slate-500">No students in this class for the current session.</p>
        ) : (
          <ul className="divide-y divide-white/5 rounded-lg border border-white/10">
            {students.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
                <div>
                  <p className="font-medium text-slate-100">{s.name}</p>
                  <p className="text-xs text-slate-500">{s.admissionNo || s.id.slice(-6)}</p>
                </div>
                <select
                  value={marks[s.id] || "Present"}
                  onChange={(e) =>
                    setMarks((m) => ({ ...m, [s.id]: e.target.value as Status }))
                  }
                  className="rounded-md border border-white/10 bg-black/40 px-2 py-1 text-xs text-white"
                >
                  <option>Present</option>
                  <option>Absent</option>
                  <option>Late</option>
                  <option>Excused</option>
                </select>
              </li>
            ))}
          </ul>
        )}
      </section>

      <SmisModuleShell
        title="Attendance log"
        description="Saved rolls and manual entries (server-backed)."
        storageKey="odelhub-smis-attendance"
        columns={["Date", "Class", "Student", "Status (Present/Absent/Late)"]}
      />
    </div>
  );
}
