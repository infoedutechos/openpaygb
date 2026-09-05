"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSchoolAdminApi } from "@/hooks/useSchoolAdminApi";
import { useMasterOrgSlug } from "@/hooks/useMasterOrgSlug";
import { clientFetchErrorMessage } from "@/lib/client-fetch-error";
import { SmisModuleShell } from "@/components/admin/school/SmisModuleShell";

type Center = { id: string; slug: string; name: string; unitKind: string; isCurrent?: boolean };
type ClassRow = { id: string; code: string; name: string; studentCount: number };
type StudentRow = { id: string; name: string; admissionNo: string };
type SheetDraft = { surahJuz: string; pagesAyat: string; note: string };

const COL_STUDENT = "Student";
const COL_SURAH = "Surah / Juz";
const COL_PAGES = "Pages / Ayat";
const COL_NOTE = "Teacher note";

/** Qur'an hifz tracker: choose centre → student entry form / class spreadsheet. */
export function SchoolQuranProgress() {
  const { schoolFetch, needsOrgSlug, isMaster } = useSchoolAdminApi();
  const { setOrgSlug } = useMasterOrgSlug();

  const [centers, setCenters] = useState<Center[]>([]);
  const [centerSlug, setCenterSlug] = useState("");
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [classId, setClassId] = useState("");
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [studentQuery, setStudentQuery] = useState("");
  const [studentId, setStudentId] = useState("");
  const [surahJuz, setSurahJuz] = useState("");
  const [pagesAyat, setPagesAyat] = useState("");
  const [teacherNote, setTeacherNote] = useState("");
  const [sheet, setSheet] = useState<Record<string, SheetDraft>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [savedNote, setSavedNote] = useState<string | null>(null);
  const [logKey, setLogKey] = useState(0);

  const centerChosen = Boolean(centerSlug);
  const selectedStudent = useMemo(
    () => students.find((s) => s.id === studentId) ?? null,
    [students, studentId],
  );
  const selectedClass = useMemo(
    () => classes.find((c) => c.id === classId) ?? null,
    [classes, classId],
  );

  const filteredStudents = useMemo(() => {
    const q = studentQuery.trim().toLowerCase();
    if (!q) return students;
    return students.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.admissionNo.toLowerCase().includes(q) ||
        s.id.toLowerCase().includes(q),
    );
  }, [students, studentQuery]);

  const schoolParams = useMemo(
    () => (extra?: Record<string, string | number | undefined | null>) => ({
      ...extra,
      organizationSlug: centerSlug || undefined,
    }),
    [centerSlug],
  );

  const loadCenters = useCallback(async () => {
    if (needsOrgSlug) return;
    try {
      const res = await schoolFetch("/api/admin/school/centers");
      if (!res.ok) return;
      const data = (await res.json()) as { centers?: Center[]; currentSlug?: string };
      const list = data.centers ?? [];
      setCenters(list);
      // Leave unselected so the form appears only after an explicit centre choice.
    } catch {
      /* ignore */
    }
  }, [needsOrgSlug, schoolFetch]);

  const loadClasses = useCallback(async () => {
    if (needsOrgSlug || !centerChosen) return;
    try {
      const res = await schoolFetch("/api/admin/school/classes", undefined, schoolParams({ allSessions: "1" }));
      if (!res.ok) return;
      const data = (await res.json()) as { classes?: (ClassRow & { enabled?: boolean })[] };
      setClasses((data.classes ?? []).filter((c) => c.enabled !== false));
    } catch {
      /* ignore */
    }
  }, [centerChosen, needsOrgSlug, schoolFetch, schoolParams]);

  const loadStudents = useCallback(async () => {
    if (needsOrgSlug || !centerChosen) {
      setStudents([]);
      return;
    }
    setError(null);
    try {
      const params = schoolParams({ limit: "500", schoolClassId: classId || undefined });
      const res = await schoolFetch("/api/students", undefined, params);
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
      setSheet((prev) => {
        const next: Record<string, SheetDraft> = {};
        for (const s of rows) {
          next[s.id] = prev[s.id] ?? { surahJuz: "", pagesAyat: "", note: "" };
        }
        return next;
      });
      if (studentId && !rows.some((r) => r.id === studentId)) {
        setStudentId("");
        setStudentQuery("");
      }
    } catch (e) {
      setError(clientFetchErrorMessage(e));
    }
  }, [centerChosen, classId, needsOrgSlug, schoolFetch, schoolParams, studentId]);

  useEffect(() => {
    void loadCenters();
  }, [loadCenters]);

  useEffect(() => {
    void loadClasses();
  }, [loadClasses]);

  useEffect(() => {
    void loadStudents();
  }, [loadStudents]);

  function onCenterChange(slug: string) {
    setCenterSlug(slug);
    setClassId("");
    setStudentId("");
    setStudentQuery("");
    setSavedNote(null);
    if (isMaster && slug) setOrgSlug(slug);
  }

  async function savePayload(payload: Record<string, string>) {
    const res = await schoolFetch(
      "/api/admin/school/smis",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          module: "quran",
          payload,
          organizationSlug: centerSlug || undefined,
        }),
      },
      schoolParams(),
    );
    const j = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(typeof j.error === "string" ? j.error : "Save failed");
  }

  async function addEntry() {
    if (!selectedStudent) {
      setError("Choose a student.");
      return;
    }
    if (!surahJuz.trim() && !pagesAyat.trim() && !teacherNote.trim()) {
      setError("Enter Surah / Juz, Pages / Ayat, or a teacher note.");
      return;
    }
    setBusy(true);
    setError(null);
    setSavedNote(null);
    try {
      const centerName = centers.find((c) => c.slug === centerSlug)?.name ?? centerSlug;
      await savePayload({
        Center: centerName,
        [COL_STUDENT]: `${selectedStudent.name}${selectedStudent.admissionNo ? ` (${selectedStudent.admissionNo})` : ""}`,
        studentId: selectedStudent.id,
        [COL_SURAH]: surahJuz.trim(),
        [COL_PAGES]: pagesAyat.trim(),
        [COL_NOTE]: teacherNote.trim(),
        Class: selectedClass ? `${selectedClass.code} — ${selectedClass.name}` : "",
      });
      setSurahJuz("");
      setPagesAyat("");
      setTeacherNote("");
      setSavedNote(`Saved progress for ${selectedStudent.name}.`);
      setLogKey((k) => k + 1);
    } catch (e) {
      setError(clientFetchErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function saveSheetRow(student: StudentRow) {
    const draft = sheet[student.id];
    if (!draft || (!draft.surahJuz.trim() && !draft.pagesAyat.trim() && !draft.note.trim())) {
      setError("Enter progress fields before saving a row.");
      return;
    }
    setBusy(true);
    setError(null);
    setSavedNote(null);
    try {
      const centerName = centers.find((c) => c.slug === centerSlug)?.name ?? centerSlug;
      await savePayload({
        Center: centerName,
        [COL_STUDENT]: `${student.name}${student.admissionNo ? ` (${student.admissionNo})` : ""}`,
        studentId: student.id,
        [COL_SURAH]: draft.surahJuz.trim(),
        [COL_PAGES]: draft.pagesAyat.trim(),
        [COL_NOTE]: draft.note.trim(),
        Class: selectedClass ? `${selectedClass.code} — ${selectedClass.name}` : "",
      });
      setSheet((prev) => ({
        ...prev,
        [student.id]: { surahJuz: "", pagesAyat: "", note: "" },
      }));
      setSavedNote(`Saved spreadsheet row for ${student.name}.`);
      setLogKey((k) => k + 1);
    } catch (e) {
      setError(clientFetchErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-white">Qur&apos;an memorisation progress</h1>
        <p className="text-sm text-slate-400">
          Track hifz / revision progress for Uwais and similar centres.
        </p>
      </div>

      {needsOrgSlug ? <p className="text-sm text-amber-300">Master: set org slug first.</p> : null}

      <label className="block max-w-md text-xs text-slate-400">
        Choose center
        <select
          value={centerSlug}
          onChange={(e) => onCenterChange(e.target.value)}
          className="mt-1 w-full rounded-lg border border-white/15 bg-[#0a101f] px-3 py-2 text-sm text-white"
        >
          <option value="">Select a centre…</option>
          {centers.map((c) => (
            <option key={c.id} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
      </label>

      {!centerChosen ? (
        <p className="text-sm text-slate-500">Select a centre to record student progress.</p>
      ) : (
        <>
          <section className="space-y-4 rounded-2xl border border-white/10 bg-[#0a101f] p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs text-slate-400 sm:col-span-2">
                Class (optional — opens spreadsheet roster)
                <select
                  value={classId}
                  onChange={(e) => {
                    setClassId(e.target.value);
                    setStudentId("");
                    setStudentQuery("");
                  }}
                  className="mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white"
                >
                  <option value="">All students / single entry</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} — {c.name} ({c.studentCount})
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-xs text-slate-400 sm:col-span-2">
                Search student
                <input
                  value={studentQuery}
                  onChange={(e) => {
                    setStudentQuery(e.target.value);
                    setStudentId("");
                  }}
                  placeholder="Name or admission number"
                  className="mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white"
                />
              </label>

              <label className="text-xs text-slate-400 sm:col-span-2">
                Student
                <select
                  value={studentId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setStudentId(id);
                    const s = students.find((x) => x.id === id);
                    if (s) setStudentQuery(s.name);
                  }}
                  className="mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white"
                >
                  <option value="">Select student…</option>
                  {filteredStudents.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                      {s.admissionNo ? ` — ${s.admissionNo}` : ""}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-xs text-slate-400">
                {COL_SURAH}
                <input
                  value={surahJuz}
                  onChange={(e) => setSurahJuz(e.target.value)}
                  placeholder="e.g. Al-Baqarah / Juz 1"
                  className="mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white"
                />
              </label>
              <label className="text-xs text-slate-400">
                {COL_PAGES}
                <input
                  value={pagesAyat}
                  onChange={(e) => setPagesAyat(e.target.value)}
                  placeholder="e.g. pp. 12–14 / 1:1–1:7"
                  className="mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white"
                />
              </label>
              <label className="text-xs text-slate-400 sm:col-span-2">
                {COL_NOTE}
                <input
                  value={teacherNote}
                  onChange={(e) => setTeacherNote(e.target.value)}
                  placeholder="Revision quality, tajweed notes…"
                  className="mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white"
                />
              </label>
            </div>
            {error ? <p className="text-sm text-rose-300">{error}</p> : null}
            {savedNote ? <p className="text-sm text-emerald-300">{savedNote}</p> : null}
            <button
              type="button"
              disabled={busy}
              onClick={() => void addEntry()}
              className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {busy ? "Saving…" : "Add entry"}
            </button>
          </section>

          {classId ? (
            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-white">
                Class roster — {selectedClass?.code} {selectedClass?.name}
              </h2>
              {students.length === 0 ? (
                <p className="text-sm text-slate-500">No students in this class.</p>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-white/10">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-white/5 text-xs uppercase tracking-wide text-slate-400">
                      <tr>
                        <th className="px-3 py-2 font-medium">Student</th>
                        <th className="px-3 py-2 font-medium">{COL_SURAH}</th>
                        <th className="px-3 py-2 font-medium">{COL_PAGES}</th>
                        <th className="px-3 py-2 font-medium">{COL_NOTE}</th>
                        <th className="px-3 py-2 font-medium"> </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                      {students.map((s) => {
                        const draft = sheet[s.id] ?? { surahJuz: "", pagesAyat: "", note: "" };
                        return (
                          <tr key={s.id} className="bg-[#0a101f]/80">
                            <td className="whitespace-nowrap px-3 py-2 text-slate-100">
                              <div className="font-medium">{s.name}</div>
                              <div className="text-xs text-slate-500">{s.admissionNo || "—"}</div>
                            </td>
                            <td className="px-3 py-2">
                              <input
                                value={draft.surahJuz}
                                onChange={(e) =>
                                  setSheet((prev) => ({
                                    ...prev,
                                    [s.id]: { ...draft, surahJuz: e.target.value },
                                  }))
                                }
                                className="w-36 rounded border border-white/10 bg-black/40 px-2 py-1 text-white"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                value={draft.pagesAyat}
                                onChange={(e) =>
                                  setSheet((prev) => ({
                                    ...prev,
                                    [s.id]: { ...draft, pagesAyat: e.target.value },
                                  }))
                                }
                                className="w-32 rounded border border-white/10 bg-black/40 px-2 py-1 text-white"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                value={draft.note}
                                onChange={(e) =>
                                  setSheet((prev) => ({
                                    ...prev,
                                    [s.id]: { ...draft, note: e.target.value },
                                  }))
                                }
                                className="min-w-[10rem] w-full rounded border border-white/10 bg-black/40 px-2 py-1 text-white"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => void saveSheetRow(s)}
                                className="rounded bg-emerald-700 px-2 py-1 text-xs font-semibold text-white disabled:opacity-50"
                              >
                                Save
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          ) : null}

          <SmisModuleShell
            key={logKey}
            title="Progress log"
            description="Saved hifz / revision entries for this school."
            storageKey="odelhub-smis-quran"
            columns={[COL_STUDENT, COL_SURAH, COL_PAGES, COL_NOTE]}
            logOnly
          />
        </>
      )}
    </div>
  );
}
