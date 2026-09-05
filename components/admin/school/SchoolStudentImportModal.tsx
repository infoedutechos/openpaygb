"use client";



import { useCallback, useEffect, useState } from "react";

import { ModalHeader } from "@/components/nav/ModalHeader";
import { useSchoolAdminApi } from "@/hooks/useSchoolAdminApi";



type Session = { id: string; label: string };

type ClassRow = { id: string; code: string; name: string; studentCount: number };

type ExternalStudent = { admissionNo?: string; name: string; classCode?: string };



type Props = {

  open: boolean;

  onClose: () => void;

  onDone: () => void;

};



export function SchoolStudentImportModal({ open, onClose, onDone }: Props) {

  const { organizationSlug, schoolFetch } = useSchoolAdminApi();

  const [tab, setTab] = useState<"internal" | "external">("internal");

  const [sessions, setSessions] = useState<Session[]>([]);

  const [classes, setClasses] = useState<ClassRow[]>([]);

  const [externalStudents, setExternalStudents] = useState<ExternalStudent[]>([]);

  const [sourceSessionId, setSourceSessionId] = useState("");

  const [classId, setClassId] = useState("");

  const [classCode, setClassCode] = useState("");

  const [selectedAdmissionNos, setSelectedAdmissionNos] = useState<string[]>([]);

  const [newOnly, setNewOnly] = useState(true);

  const [file, setFile] = useState<File | null>(null);

  const [busy, setBusy] = useState(false);

  const [message, setMessage] = useState<string | null>(null);



  const load = useCallback(async () => {

    const [sessR, clsR] = await Promise.all([

      schoolFetch("/api/admin/school/sessions"),

      schoolFetch("/api/admin/school/classes"),

    ]);

    if (sessR.ok) {

      const j = (await sessR.json()) as { sessions?: Session[] };

      setSessions(j.sessions ?? []);

    }

    if (clsR.ok) {

      const j = (await clsR.json()) as { classes?: ClassRow[] };

      setClasses((j.classes ?? []).map((c) => ({ id: c.id, code: c.code, name: c.name, studentCount: c.studentCount ?? 0 })));

    }

  }, [schoolFetch]);



  const loadExternal = useCallback(async () => {

    const r = await schoolFetch("/api/admin/school/students/import/external", undefined, {

      classCode: classCode || undefined,

    });

    if (!r.ok) {

      const j = (await r.json().catch(() => ({}))) as { error?: string };

      setMessage(j.error ?? "External import unavailable");

      setExternalStudents([]);

      return;

    }

    const j = (await r.json()) as { students?: ExternalStudent[] };

    setExternalStudents(j.students ?? []);

    setMessage(null);

  }, [classCode, schoolFetch]);



  useEffect(() => {

    if (open) void load();

  }, [open, load]);



  useEffect(() => {

    if (open && tab === "external") void loadExternal();

  }, [open, tab, loadExternal]);



  if (!open) return null;



  async function runImport() {

    setBusy(true);

    setMessage(null);

    try {

      if (tab === "external") {

        const r = await schoolFetch("/api/admin/school/students/import/external", {

          method: "POST",

          headers: { "Content-Type": "application/json" },

          body: JSON.stringify({

            organizationSlug,

            classCode: classCode || undefined,

            admissionNos: selectedAdmissionNos.length ? selectedAdmissionNos : undefined,

            newOnly,

          }),

        });

        const j = (await r.json()) as { created?: number; skipped?: number; error?: string };

        if (!r.ok) throw new Error(j.error ?? "Import failed");

        setMessage(`Imported ${j.created ?? 0} student(s)${j.skipped ? `, skipped ${j.skipped}` : ""}.`);

        onDone();

        return;

      }

      if (!file) {

        setMessage("Select a CSV file to import.");

        return;

      }

      const fd = new FormData();

      fd.set("file", file);

      fd.set("newOnly", newOnly ? "true" : "false");

      if (classId) fd.set("classId", classId);

      if (organizationSlug) fd.set("organizationSlug", organizationSlug);

      if (sourceSessionId) fd.set("sourceSessionId", sourceSessionId);

      const r = await fetch("/api/admin/school/students/import", { method: "POST", credentials: "include", body: fd });

      const j = (await r.json()) as { created?: number; updated?: number; skipped?: number; error?: string };

      if (!r.ok) throw new Error(j.error ?? "Import failed");

      setMessage(
        `Imported ${j.created ?? 0} new, updated ${j.updated ?? 0}${j.skipped ? `, skipped ${j.skipped}` : ""}.`,
      );

      onDone();

    } catch (e) {

      setMessage(e instanceof Error ? e.message : "Import failed");

    } finally {

      setBusy(false);

    }

  }



  return (

    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">

      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/10 bg-[#0a101f] p-5">

        <ModalHeader onBack={onClose} title="Import students" />

        <div className="mt-3 flex gap-2">

          {(["internal", "external"] as const).map((t) => (

            <button

              key={t}

              type="button"

              onClick={() => setTab(t)}

              className={`rounded-lg px-3 py-1.5 text-sm capitalize ${tab === t ? "bg-violet-900/50 text-violet-100" : "text-slate-400"}`}

            >

              {t}

            </button>

          ))}

        </div>

        {tab === "internal" ? (

          <div className="mt-4 space-y-3 text-sm">

            <p className="rounded-lg border border-emerald-800/40 bg-emerald-950/20 px-3 py-2 text-xs leading-relaxed text-emerald-100/90">

              Register CSV columns: Name, AdmissionNo, Sex, Phone, Email, Address, TelegramId, Class, Stream,

              ProgrammeCode, Year, Term, Session, PortalPassword (optional). Uncheck &quot;new only&quot; to update

              existing admission numbers.{" "}

              <a href="/api/admin/school/students/export?template=1" className="underline hover:text-white">

                Download template

              </a>

            </p>

            <label className="block text-slate-300">

              Source session (optional)

              <select value={sourceSessionId} onChange={(e) => setSourceSessionId(e.target.value)} className="mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-white">

                <option value="">Any / current</option>

                {sessions.map((s) => (

                  <option key={s.id} value={s.id}>{s.label}</option>

                ))}

              </select>

            </label>

            <label className="block text-slate-300">

              Target class (optional)

              <select value={classId} onChange={(e) => setClassId(e.target.value)} className="mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-white">

                <option value="">From CSV rows</option>

                {classes.map((c) => (

                  <option key={c.id} value={c.id}>{c.code} — {c.name}</option>

                ))}

              </select>

            </label>

            <label className="block text-slate-300">

              CSV file

              <input type="file" accept=".csv,text/csv" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="mt-1 w-full text-slate-300" />

            </label>

            <label className="flex items-center gap-2 text-slate-300">

              <input type="checkbox" checked={newOnly} onChange={(e) => setNewOnly(e.target.checked)} />

              Select new records only

            </label>

          </div>

        ) : (

          <div className="mt-4 space-y-3 text-sm">

            <label className="block text-slate-300">

              Filter by class (optional)

              <input

                value={classCode}

                onChange={(e) => setClassCode(e.target.value)}

                placeholder="e.g. P.1"

                className="mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-white"

              />

            </label>

            <div className="max-h-40 overflow-y-auto rounded-lg border border-white/10 p-2 space-y-1">

              {externalStudents.map((s) => {

                const key = s.admissionNo ?? s.name;

                return (

                  <label key={key} className="flex items-center gap-2 text-slate-200">

                    <input

                      type="checkbox"

                      checked={selectedAdmissionNos.includes(key)}

                      onChange={(e) =>

                        setSelectedAdmissionNos((prev) =>

                          e.target.checked ? [...prev, key] : prev.filter((id) => id !== key),

                        )

                      }

                    />

                    {s.name} {s.admissionNo ? `(${s.admissionNo})` : ""} {s.classCode ? `· ${s.classCode}` : ""}

                  </label>

                );

              })}

              {externalStudents.length === 0 ? (

                <p className="text-slate-500">No external students loaded.</p>

              ) : null}

            </div>

            <label className="flex items-center gap-2 text-slate-300">

              <input type="checkbox" checked={newOnly} onChange={(e) => setNewOnly(e.target.checked)} />

              Select new records only

            </label>

          </div>

        )}

        {message ? <p className="mt-3 text-sm text-cyan-300">{message}</p> : null}

        <div className="mt-4 flex gap-2">

          <button type="button" disabled={busy} onClick={() => void runImport()} className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">

            Import

          </button>

          <button type="button" onClick={onClose} className="rounded-lg border border-white/15 px-4 py-2 text-sm text-slate-300">

            Close

          </button>

        </div>

      </div>

    </div>

  );

}
