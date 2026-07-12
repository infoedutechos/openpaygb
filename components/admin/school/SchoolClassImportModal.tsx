"use client";

import { useCallback, useEffect, useState } from "react";
import { useSchoolAdminApi } from "@/hooks/useSchoolAdminApi";

type Session = { id: string; label: string; isActive: boolean };
type ClassRow = { id: string; code: string; name: string; studentCount: number };
type ExternalClass = { code: string; name: string; streamCount?: number };

type Props = {
  open: boolean;
  onClose: () => void;
  onDone: () => void;
};

export function SchoolClassImportModal({ open, onClose, onDone }: Props) {
  const { schoolFetch, organizationSlug } = useSchoolAdminApi();
  const [tab, setTab] = useState<"internal" | "external">("internal");
  const [sessions, setSessions] = useState<Session[]>([]);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [externalClasses, setExternalClasses] = useState<ExternalClass[]>([]);
  const [sourceSessionId, setSourceSessionId] = useState("");
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  const [selectedExternalCodes, setSelectedExternalCodes] = useState<string[]>([]);
  const [includeStudents, setIncludeStudents] = useState(true);
  const [newOnly, setNewOnly] = useState(true);
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
    const r = await schoolFetch("/api/admin/school/classes/import/external");
    if (!r.ok) {
      const j = (await r.json().catch(() => ({}))) as { error?: string };
      setMessage(j.error ?? "External import unavailable");
      setExternalClasses([]);
      return;
    }
    const j = (await r.json()) as { classes?: ExternalClass[] };
    setExternalClasses(j.classes ?? []);
    setMessage(null);
  }, [schoolFetch]);

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
        const r = await schoolFetch("/api/admin/school/classes/import/external", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            organizationSlug,
            classCodes: selectedExternalCodes.length ? selectedExternalCodes : undefined,
            includeStudents,
            newOnly,
          }),
        });
        const j = (await r.json()) as { classesCreated?: number; imported?: number; error?: string };
        if (!r.ok) throw new Error(j.error ?? "Import failed");
        setMessage(`Imported ${j.imported ?? 0} class(es), created ${j.classesCreated ?? 0} new.`);
        onDone();
        return;
      }
      const r = await schoolFetch("/api/admin/school/classes/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationSlug,
          sourceSessionId,
          classIds: selectedClassIds.length ? selectedClassIds : undefined,
          includeStudents,
          newOnly,
        }),
      });
      const j = (await r.json()) as { classesCreated?: number; studentsCopied?: number; error?: string };
      if (!r.ok) throw new Error(j.error ?? "Import failed");
      setMessage(`Imported ${j.classesCreated ?? 0} class(es), ${j.studentsCopied ?? 0} student(s).`);
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
        <h2 className="text-lg font-semibold text-white">Import class</h2>
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
            <label className="block text-slate-300">
              Source session
              <select
                value={sourceSessionId}
                onChange={(e) => setSourceSessionId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-white"
              >
                <option value="">Select session</option>
                {sessions.map((s) => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </select>
            </label>
            <p className="text-slate-400">Classes to import</p>
            <div className="max-h-40 overflow-y-auto rounded-lg border border-white/10 p-2 space-y-1">
              {classes.map((c) => (
                <label key={c.id} className="flex items-center gap-2 text-slate-200">
                  <input
                    type="checkbox"
                    checked={selectedClassIds.includes(c.id)}
                    onChange={(e) =>
                      setSelectedClassIds((prev) =>
                        e.target.checked ? [...prev, c.id] : prev.filter((id) => id !== c.id),
                      )
                    }
                  />
                  {c.code} — {c.name} ({c.studentCount} students)
                </label>
              ))}
            </div>
            <label className="flex items-center gap-2 text-slate-300">
              <input type="checkbox" checked={includeStudents} onChange={(e) => setIncludeStudents(e.target.checked)} />
              Include students in class
            </label>
            <label className="flex items-center gap-2 text-slate-300">
              <input type="checkbox" checked={newOnly} onChange={(e) => setNewOnly(e.target.checked)} />
              Select new records only
            </label>
          </div>
        ) : (
          <div className="mt-4 space-y-3 text-sm">
            <p className="text-slate-400">Classes from Results App (when configured).</p>
            <div className="max-h-40 overflow-y-auto rounded-lg border border-white/10 p-2 space-y-1">
              {externalClasses.map((c) => (
                <label key={c.code} className="flex items-center gap-2 text-slate-200">
                  <input
                    type="checkbox"
                    checked={selectedExternalCodes.includes(c.code)}
                    onChange={(e) =>
                      setSelectedExternalCodes((prev) =>
                        e.target.checked ? [...prev, c.code] : prev.filter((code) => code !== c.code),
                      )
                    }
                  />
                  {c.code} — {c.name}
                </label>
              ))}
              {externalClasses.length === 0 ? (
                <p className="text-slate-500">No external classes loaded.</p>
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
