"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAuthMe } from "@/hooks/useAuthMe";
import { useMasterOrgSlug } from "@/hooks/useMasterOrgSlug";
import { SCHOOL_LEVEL_LABELS } from "@/lib/school-structure";
import { fetchJson } from "@/utils/fetch-json";
import { SchoolClassImportModal } from "@/components/admin/school/SchoolClassImportModal";

type SchoolLevelKey = keyof typeof SCHOOL_LEVEL_LABELS;

type StreamRow = {
  id: string;
  code: string;
  name: string;
  sortOrder: number;
  enabled: boolean;
  studentCount: number;
};

type ClassRow = {
  id: string;
  code: string;
  name: string;
  levelKind: SchoolLevelKey;
  sortOrder: number;
  enabled: boolean;
  streamCount: number;
  studentCount: number;
  streams: StreamRow[];
};

const K12_TEMPLATE: { code: string; name: string; levelKind: SchoolLevelKey; sortOrder: number }[] = [
  { code: "P1", name: "Primary One", levelKind: "primary", sortOrder: 10 },
  { code: "P2", name: "Primary Two", levelKind: "primary", sortOrder: 20 },
  { code: "P3", name: "Primary Three", levelKind: "primary", sortOrder: 30 },
  { code: "P4", name: "Primary Four", levelKind: "primary", sortOrder: 40 },
  { code: "P5", name: "Primary Five", levelKind: "primary", sortOrder: 50 },
  { code: "P6", name: "Primary Six", levelKind: "primary", sortOrder: 60 },
  { code: "P7", name: "Primary Seven", levelKind: "primary", sortOrder: 70 },
  { code: "S1", name: "Senior One", levelKind: "secondary", sortOrder: 80 },
  { code: "S2", name: "Senior Two", levelKind: "secondary", sortOrder: 90 },
  { code: "S3", name: "Senior Three", levelKind: "secondary", sortOrder: 100 },
  { code: "S4", name: "Senior Four", levelKind: "secondary", sortOrder: 110 },
  { code: "S5", name: "Senior Five", levelKind: "a_level", sortOrder: 120 },
  { code: "S6", name: "Senior Six", levelKind: "a_level", sortOrder: 130 },
];

export function SchoolStructureManager() {
  const { data: authMe } = useAuthMe();
  const { orgSlug } = useMasterOrgSlug();
  const isMaster = authMe?.admin?.role === "master";
  const isSchool =
    authMe?.admin?.organization?.institutionTier === "school" ||
    (isMaster && Boolean(orgSlug));

  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [academicYear, setAcademicYear] = useState("");
  const [savedYear, setSavedYear] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const [newClass, setNewClass] = useState({ code: "", name: "", levelKind: "primary" as SchoolLevelKey });
  const [streamDraft, setStreamDraft] = useState<Record<string, { code: string; name: string }>>({});
  const [importOpen, setImportOpen] = useState(false);
  const [editClassId, setEditClassId] = useState<string | null>(null);
  const [editClassForm, setEditClassForm] = useState({ code: "", name: "", levelKind: "primary" as SchoolLevelKey });

  const query = isMaster && orgSlug ? `?organizationSlug=${encodeURIComponent(orgSlug)}` : "";

  const load = useCallback(async () => {
    const r = await fetchJson(`/api/admin/school/classes${query}`, { credentials: "include" });
    const j = (await r.json()) as {
      classes?: ClassRow[];
      currentAcademicYearLabel?: string;
      error?: string;
    };
    if (!r.ok) {
      setError(j.error ?? "Could not load school structure");
      return;
    }
    setClasses(j.classes ?? []);
    setAcademicYear(j.currentAcademicYearLabel ?? "");
    setSavedYear(j.currentAcademicYearLabel ?? "");
    setError(null);
  }, [query]);

  useEffect(() => {
    if (isSchool) void load();
  }, [isSchool, load]);

  async function saveAcademicYear() {
    setBusy("year");
    setError(null);
    try {
      const r = await fetchJson("/api/admin/organization/settings", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentAcademicYearLabel: academicYear }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error((j as { error?: string }).error ?? "Save failed");
      setSavedYear(academicYear);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(null);
    }
  }

  async function addClass(e: React.FormEvent) {
    e.preventDefault();
    setBusy("class");
    setError(null);
    try {
      const r = await fetchJson("/api/admin/school/classes", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newClass,
          ...(isMaster && orgSlug ? { organizationSlug: orgSlug } : {}),
        }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error((j as { error?: string }).error ?? "Create failed");
      setNewClass({ code: "", name: "", levelKind: "primary" });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Create failed");
    } finally {
      setBusy(null);
    }
  }

  async function addStream(classId: string) {
    const draft = streamDraft[classId];
    if (!draft?.code.trim() || !draft?.name.trim()) return;
    setBusy(`stream-${classId}`);
    setError(null);
    try {
      const r = await fetchJson("/api/admin/school/streams", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schoolClassId: classId,
          code: draft.code,
          name: draft.name,
          syncProgramme: true,
          ...(isMaster && orgSlug ? { organizationSlug: orgSlug } : {}),
        }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error((j as { error?: string }).error ?? "Create failed");
      setStreamDraft((prev) => ({ ...prev, [classId]: { code: "", name: "" } }));
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Create failed");
    } finally {
      setBusy(null);
    }
  }

  async function loadK12Template() {
    if (!confirm("Create standard P1–P7 and S1–S6 classes? Existing codes are skipped.")) return;
    setBusy("template");
    setError(null);
    try {
      for (const row of K12_TEMPLATE) {
        const existing = classes.find((c) => c.code === row.code);
        if (existing) continue;
        const r = await fetchJson("/api/admin/school/classes", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...row,
            ...(isMaster && orgSlug ? { organizationSlug: orgSlug } : {}),
          }),
        });
        if (!r.ok && r.status !== 409) {
          const j = await r.json();
          throw new Error((j as { error?: string }).error ?? "Template load failed");
        }
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Template load failed");
    } finally {
      setBusy(null);
    }
  }

  if (!isSchool) {
    return (
      <p className="text-sm text-slate-400">
        School structure is available for primary and secondary school workspaces only.
      </p>
    );
  }

  if (isMaster && !orgSlug) {
    return (
      <p className="text-sm text-amber-200/90">
        Select a school tenant with the workspace picker above to manage classes and streams.
      </p>
    );
  }

  return (
    <div className="space-y-8">
      {error ? <p className="text-sm text-rose-400">{error}</p> : null}

      <section className="rounded-xl border border-sky-500/20 bg-sky-950/15 p-5">
        <h2 className="text-sm font-semibold text-sky-100">Academic year</h2>
        <p className="mt-1 text-xs text-slate-500">Display label for the current school year (e.g. 2025/2026).</p>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <label className="flex flex-col text-xs text-slate-500">
            Label
            <input
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              placeholder="2025/2026"
              className="mt-1 w-48 rounded-lg border border-[var(--border)] bg-[#0d1526] px-3 py-2 text-sm text-white"
            />
          </label>
          <button
            type="button"
            disabled={busy !== null || academicYear === savedYear}
            onClick={() => void saveAcademicYear()}
            className="rounded-lg bg-sky-600 px-4 py-2 text-xs font-semibold text-white hover:bg-sky-500 disabled:opacity-50"
          >
            {busy === "year" ? "Saving…" : "Save academic year"}
          </button>
        </div>
      </section>

      <section className="rounded-xl border border-emerald-500/20 bg-emerald-950/15 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-emerald-100">Classes & streams</h2>
            <p className="mt-1 max-w-2xl text-xs text-slate-500">
              Define class levels (P1, P7, S1…) and streams (A, B, Science…). Each stream auto-creates a checkout
              programme and links to{" "}
              <Link href="/admin/programmes" className="text-cyan-300 underline hover:text-cyan-200">
                programmes & term fees
              </Link>
              .
            </p>
          </div>
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => setImportOpen(true)}
            className="rounded-lg border border-violet-400/30 px-3 py-2 text-xs font-semibold text-violet-100 hover:bg-violet-500/10 disabled:opacity-50"
          >
            Import class
          </button>
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => void loadK12Template()}
            className="rounded-lg border border-emerald-400/30 px-3 py-2 text-xs font-semibold text-emerald-100 hover:bg-emerald-500/10 disabled:opacity-50"
          >
            {busy === "template" ? "Loading…" : "Load K–12 template"}
          </button>
        </div>

        <form onSubmit={(e) => void addClass(e)} className="mt-4 grid gap-3 sm:grid-cols-4">
          <input
            required
            value={newClass.code}
            onChange={(e) => setNewClass((f) => ({ ...f, code: e.target.value }))}
            placeholder="Code (P7)"
            className="rounded-lg border border-[var(--border)] bg-[#0d1526] px-3 py-2 text-sm text-white"
          />
          <input
            required
            value={newClass.name}
            onChange={(e) => setNewClass((f) => ({ ...f, name: e.target.value }))}
            placeholder="Name (Primary Seven)"
            className="rounded-lg border border-[var(--border)] bg-[#0d1526] px-3 py-2 text-sm text-white sm:col-span-2"
          />
          <select
            value={newClass.levelKind}
            onChange={(e) => setNewClass((f) => ({ ...f, levelKind: e.target.value as SchoolLevelKey }))}
            className="rounded-lg border border-[var(--border)] bg-[#0d1526] px-3 py-2 text-sm text-white"
          >
            {Object.entries(SCHOOL_LEVEL_LABELS).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={busy !== null}
            className="sm:col-span-4 rounded-lg bg-emerald-600 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            {busy === "class" ? "Adding…" : "Add class"}
          </button>
        </form>

        <div className="mt-6 space-y-4">
          {classes.length === 0 ? (
            <p className="text-sm text-slate-500">No classes yet — add one or load the K–12 template.</p>
          ) : (
            classes.map((c) => (
              <div key={c.id} className="rounded-lg border border-white/10 bg-black/20 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium text-white">
                      {c.code} · {c.name}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {SCHOOL_LEVEL_LABELS[c.levelKind]} · {c.streams.length} stream(s) · {c.studentCount} student(s)
                    </p>
                  </div>
                  <div className="flex gap-2 text-xs">
                    <button type="button" className="text-amber-300" onClick={() => { setEditClassId(c.id); setEditClassForm({ code: c.code, name: c.name, levelKind: c.levelKind }); }}>Edit</button>
                    <button type="button" className="text-rose-300" onClick={() => { if (confirm(`Delete class ${c.code}?`)) void fetchJson(`/api/admin/school/classes/${c.id}`, { method: "DELETE", credentials: "include" }).then(() => load()); }}>Delete</button>
                  </div>
                </div>
                {editClassId === c.id ? (
                  <form className="mt-3 flex flex-wrap gap-2 border-t border-white/10 pt-3" onSubmit={(e) => {
                    e.preventDefault();
                    void fetchJson(`/api/admin/school/classes/${c.id}`, { method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editClassForm) }).then(() => { setEditClassId(null); void load(); });
                  }}>
                    <input value={editClassForm.code} onChange={(e) => setEditClassForm({ ...editClassForm, code: e.target.value })} className="rounded border border-white/15 bg-black/30 px-2 py-1 text-sm text-white" />
                    <input value={editClassForm.name} onChange={(e) => setEditClassForm({ ...editClassForm, name: e.target.value })} className="rounded border border-white/15 bg-black/30 px-2 py-1 text-sm text-white" />
                    <button type="submit" className="text-xs text-emerald-300">Save class</button>
                  </form>
                ) : null}
                <ul className="mt-3 space-y-2 border-t border-white/10 pt-3">
                  {c.streams.map((s) => (
                    <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-300">
                      <span>
                        <span className="font-mono text-cyan-200">{s.code}</span> — {s.name}
                        <span className="ml-2 text-[11px] text-slate-500">({s.studentCount} students)</span>
                      </span>
                      <span className="text-[11px] text-slate-600">Programme: {c.code}-{s.code}</span>
                      <button type="button" className="text-[10px] text-rose-400" onClick={() => { if (confirm(`Delete stream ${s.code}?`)) void fetchJson(`/api/admin/school/streams/${s.id}`, { method: "DELETE", credentials: "include" }).then(() => load()); }}>Delete</button>
                    </li>
                  ))}
                </ul>
                <div className="mt-3 flex flex-wrap gap-2 border-t border-white/10 pt-3">
                  <input
                    value={streamDraft[c.id]?.code ?? ""}
                    onChange={(e) =>
                      setStreamDraft((prev) => ({
                        ...prev,
                        [c.id]: { code: e.target.value, name: prev[c.id]?.name ?? "" },
                      }))
                    }
                    placeholder="Stream code"
                    className="w-28 rounded border border-[var(--border)] bg-[#0d1526] px-2 py-1.5 text-sm text-white"
                  />
                  <input
                    value={streamDraft[c.id]?.name ?? ""}
                    onChange={(e) =>
                      setStreamDraft((prev) => ({
                        ...prev,
                        [c.id]: { code: prev[c.id]?.code ?? "", name: e.target.value },
                      }))
                    }
                    placeholder="Stream name"
                    className="min-w-[8rem] flex-1 rounded border border-[var(--border)] bg-[#0d1526] px-2 py-1.5 text-sm text-white"
                  />
                  <button
                    type="button"
                    disabled={busy !== null}
                    onClick={() => void addStream(c.id)}
                    className="rounded-lg bg-cyan-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-cyan-500 disabled:opacity-50"
                  >
                    {busy === `stream-${c.id}` ? "…" : "Add stream"}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
      <SchoolClassImportModal open={importOpen} onClose={() => setImportOpen(false)} onDone={() => void load()} />
    </div>
  );
}
