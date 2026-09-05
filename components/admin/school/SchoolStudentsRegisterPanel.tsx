"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSchoolAdminApi } from "@/hooks/useSchoolAdminApi";
import { ModalNextButton } from "@/components/nav/ModalHeader";

type ClassOption = {
  id: string;
  code: string;
  name: string;
  streams: { id: string; code: string; name: string }[];
};

type RegisterDraft = {
  id: string;
  name: string;
  admissionNo: string;
  sex: "male" | "female" | "other";
  phone: string;
  email: string;
  address: string;
  telegramId: string;
  schoolClassId: string;
  schoolStreamId: string;
  year: number;
  semester: number;
  programmeCode: string;
  sessionLabel: string;
  dirty: boolean;
  isNew?: boolean;
};

type ApiStudent = {
  id: string;
  name: string;
  admissionNo?: string;
  sex?: string;
  phone?: string;
  email?: string;
  address?: string;
  telegramId?: string;
  schoolClassId?: string | null;
  schoolStreamId?: string | null;
  schoolClassCode?: string | null;
  schoolStreamCode?: string | null;
  year: number;
  semester: number;
  programmeCode: string;
};

type Props = {
  search: string;
  classFilter: string;
  classes: ClassOption[];
  onOpenActions: (student: { id: string; name: string }) => void;
  onImportOpen: () => void;
  refreshKey?: number;
};

function emptyRow(seed = 0): RegisterDraft {
  return {
    id: `new-${Date.now()}-${seed}`,
    name: "",
    admissionNo: "",
    sex: "other",
    phone: "",
    email: "",
    address: "",
    telegramId: "",
    schoolClassId: "",
    schoolStreamId: "",
    year: 1,
    semester: 1,
    programmeCode: "",
    sessionLabel: "",
    dirty: true,
    isNew: true,
  };
}

function toDraft(s: ApiStudent): RegisterDraft {
  return {
    id: s.id,
    name: s.name ?? "",
    admissionNo: s.admissionNo ?? "",
    sex: (s.sex as RegisterDraft["sex"]) || "other",
    phone: s.phone ?? "",
    email: s.email ?? "",
    address: s.address ?? "",
    telegramId: s.telegramId ?? "",
    schoolClassId: s.schoolClassId ?? "",
    schoolStreamId: s.schoolStreamId ?? "",
    year: s.year ?? 1,
    semester: s.semester ?? 1,
    programmeCode: s.programmeCode ?? "",
    sessionLabel: "",
    dirty: false,
    isNew: false,
  };
}

const cell =
  "min-w-[7.5rem] border-0 border-r border-emerald-900/40 bg-transparent px-1.5 py-1 text-xs text-slate-100 outline-none focus:bg-emerald-950/40";
const head =
  "sticky top-0 z-[1] whitespace-nowrap border-b border-emerald-800/50 bg-[#0c1a14] px-2 py-2 text-[10px] font-semibold uppercase tracking-wide text-emerald-200/90";

export function SchoolStudentsRegisterPanel({
  search,
  classFilter,
  classes,
  onOpenActions,
  onImportOpen,
  refreshKey = 0,
}: Props) {
  const { organizationSlug } = useSchoolAdminApi();
  const [rows, setRows] = useState<RegisterDraft[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qp = new URLSearchParams();
      qp.set("limit", "500");
      if (search.trim()) qp.set("q", search.trim());
      if (classFilter) qp.set("schoolClassId", classFilter);
      if (organizationSlug) qp.set("organizationSlug", organizationSlug);
      const r = await fetch(`/api/students?${qp}`, { credentials: "include" });
      const j = (await r.json()) as { students?: ApiStudent[]; error?: string };
      if (!r.ok) throw new Error(j.error ?? "Failed to load register");
      setRows((j.students ?? []).map(toDraft));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load register");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [search, classFilter, organizationSlug]);

  useEffect(() => {
    const t = setTimeout(() => void load(), 250);
    return () => clearTimeout(t);
  }, [load, refreshKey]);

  const dirtyCount = useMemo(() => rows.filter((r) => r.dirty).length, [rows]);

  function patchRow(id: string, patch: Partial<RegisterDraft>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch, dirty: true } : r)));
  }

  async function saveRow(row: RegisterDraft) {
    if (!row.name.trim()) {
      setError("Name is required before saving a register row.");
      return;
    }
    setBusyId(row.id);
    setError(null);
    setNote(null);
    try {
      if (row.isNew) {
        if (!row.schoolClassId || !row.schoolStreamId) {
          throw new Error("Select class and stream for new students.");
        }
        const r = await fetch("/api/students", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: row.name.trim(),
            admissionNo: row.admissionNo.trim() || undefined,
            sex: row.sex,
            phone: row.phone.trim(),
            email: row.email.trim() || undefined,
            address: row.address.trim(),
            telegramId: row.telegramId.trim(),
            schoolClassId: row.schoolClassId,
            schoolStreamId: row.schoolStreamId,
            year: row.year,
            semester: row.semester,
            ...(organizationSlug ? { organizationSlug } : {}),
          }),
        });
        const j = (await r.json()) as { error?: string; details?: unknown };
        if (!r.ok) {
          throw new Error(
            (j.error ?? "Create failed") +
              (j.details ? ` ${JSON.stringify(j.details)}` : ""),
          );
        }
        setNote(`Added ${row.name.trim()} to the register.`);
        await load();
        return;
      }

      const payload: Record<string, string | number> = {
        name: row.name.trim(),
        admissionNo: row.admissionNo.trim(),
        sex: row.sex,
        phone: row.phone.trim(),
        email: row.email.trim(),
        address: row.address.trim(),
        telegramId: row.telegramId.trim(),
        year: row.year,
        semester: row.semester,
      };
      if (row.schoolClassId && row.schoolStreamId) {
        payload.schoolClassId = row.schoolClassId;
        payload.schoolStreamId = row.schoolStreamId;
      }
      const r = await fetch(`/api/students/${row.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = (await r.json()) as { error?: string; details?: unknown };
      if (!r.ok) {
        throw new Error(
          (j.error ?? "Save failed") + (j.details ? ` ${JSON.stringify(j.details)}` : ""),
        );
      }
      setRows((prev) =>
        prev.map((x) => (x.id === row.id ? { ...x, dirty: false, isNew: false } : x)),
      );
      setNote(`Saved ${row.name.trim()}.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusyId(null);
    }
  }

  async function saveAllDirty() {
    const dirty = rows.filter((r) => r.dirty);
    for (const row of dirty) {
      await saveRow(row);
    }
  }

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-emerald-100">Students register</h2>
          <p className="text-xs text-slate-400">
            Excel-style roster — name, admission, contacts, class/stream, year, term, Telegram. Edit cells and
            save. CSV template matches these columns.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          <a
            href="/api/admin/school/students/export?template=1"
            className="rounded-lg border border-emerald-700/50 px-3 py-1.5 text-emerald-200 hover:bg-emerald-950/40"
          >
            Download template
          </a>
          <a
            href="/api/admin/school/students/export"
            className="rounded-lg border border-emerald-700/50 px-3 py-1.5 text-emerald-200 hover:bg-emerald-950/40"
          >
            Export CSV
          </a>
          <button
            type="button"
            onClick={onImportOpen}
            className="rounded-lg border border-violet-600/40 px-3 py-1.5 text-violet-200 hover:bg-violet-950/30"
          >
            Import CSV
          </button>
          <button
            type="button"
            onClick={() => setRows((prev) => [...prev, emptyRow(prev.length)])}
            className="rounded-lg border border-white/15 px-3 py-1.5 text-slate-200 hover:bg-white/5"
          >
            + Row
          </button>
          <ModalNextButton
            disabled={dirtyCount === 0 || busyId != null}
            onClick={() => void saveAllDirty()}
            label={busyId ? "Saving…" : `Save all (${dirtyCount})`}
          />
        </div>
      </div>

      {error ? <p className="text-sm text-rose-400">{error}</p> : null}
      {note ? <p className="text-sm text-emerald-300">{note}</p> : null}
      {loading ? <p className="text-xs text-slate-500">Loading register…</p> : null}

      <div className="overflow-auto rounded-xl border border-emerald-800/40 bg-[#07140f] shadow-inner">
        <table className="min-w-[72rem] border-collapse text-left">
          <thead>
            <tr>
              <th className={head}>#</th>
              <th className={head}>AdmissionNo</th>
              <th className={`${head} min-w-[10rem]`}>Name</th>
              <th className={head}>Sex</th>
              <th className={head}>Phone</th>
              <th className={head}>Email</th>
              <th className={head}>Address</th>
              <th className={head}>TelegramId</th>
              <th className={head}>Class</th>
              <th className={head}>Stream</th>
              <th className={head}>Year</th>
              <th className={head}>Term</th>
              <th className={head}>Programme</th>
              <th className={head}>Save</th>
              <th className={head}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => {
              const streams =
                classes.find((c) => c.id === row.schoolClassId)?.streams ?? [];
              return (
                <tr
                  key={row.id}
                  className={`border-b border-emerald-900/30 ${row.dirty ? "bg-amber-950/20" : idx % 2 ? "bg-black/20" : ""}`}
                >
                  <td className="px-2 py-1 font-mono text-[10px] text-slate-500">{idx + 1}</td>
                  <td>
                    <input
                      value={row.admissionNo}
                      onChange={(e) => patchRow(row.id, { admissionNo: e.target.value })}
                      className={`${cell} font-mono`}
                      placeholder="auto"
                    />
                  </td>
                  <td>
                    <input
                      value={row.name}
                      onChange={(e) => patchRow(row.id, { name: e.target.value })}
                      className={`${cell} min-w-[10rem] font-medium`}
                      placeholder="Full name"
                    />
                  </td>
                  <td>
                    <select
                      value={row.sex}
                      onChange={(e) =>
                        patchRow(row.id, { sex: e.target.value as RegisterDraft["sex"] })
                      }
                      className={cell}
                    >
                      <option value="female">female</option>
                      <option value="male">male</option>
                      <option value="other">other</option>
                    </select>
                  </td>
                  <td>
                    <input
                      value={row.phone}
                      onChange={(e) => patchRow(row.id, { phone: e.target.value })}
                      className={cell}
                    />
                  </td>
                  <td>
                    <input
                      value={row.email}
                      onChange={(e) => patchRow(row.id, { email: e.target.value })}
                      className={`${cell} min-w-[9rem]`}
                    />
                  </td>
                  <td>
                    <input
                      value={row.address}
                      onChange={(e) => patchRow(row.id, { address: e.target.value })}
                      className={`${cell} min-w-[8rem]`}
                    />
                  </td>
                  <td>
                    <input
                      value={row.telegramId}
                      onChange={(e) => patchRow(row.id, { telegramId: e.target.value })}
                      className={cell}
                      placeholder="chat id"
                    />
                  </td>
                  <td>
                    <select
                      value={row.schoolClassId}
                      onChange={(e) =>
                        patchRow(row.id, {
                          schoolClassId: e.target.value,
                          schoolStreamId: "",
                        })
                      }
                      className={cell}
                    >
                      <option value="">—</option>
                      {classes.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.code}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <select
                      value={row.schoolStreamId}
                      onChange={(e) => patchRow(row.id, { schoolStreamId: e.target.value })}
                      className={cell}
                      disabled={!row.schoolClassId}
                    >
                      <option value="">—</option>
                      {streams.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.code}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <select
                      value={row.year}
                      onChange={(e) => patchRow(row.id, { year: Number(e.target.value) })}
                      className={cell}
                    >
                      {[1, 2, 3, 4, 5, 6].map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input
                      type="number"
                      min={1}
                      max={99}
                      value={row.semester}
                      onChange={(e) =>
                        patchRow(row.id, { semester: Math.max(1, Number(e.target.value) || 1) })
                      }
                      className={`${cell} w-14`}
                    />
                  </td>
                  <td className="px-2 py-1 font-mono text-[10px] text-slate-500">
                    {row.programmeCode || "—"}
                  </td>
                  <td className="px-1 py-1">
                    <button
                      type="button"
                      disabled={busyId === row.id || !row.dirty}
                      onClick={() => void saveRow(row)}
                      className="rounded bg-emerald-700/80 px-2 py-1 text-[10px] font-semibold text-white disabled:opacity-40"
                    >
                      {busyId === row.id ? "…" : row.dirty ? "Save →" : "OK"}
                    </button>
                  </td>
                  <td className="px-1 py-1">
                    {!row.isNew ? (
                      <button
                        type="button"
                        onClick={() => onOpenActions({ id: row.id, name: row.name })}
                        className="text-[10px] font-semibold text-violet-300 hover:underline"
                      >
                        More
                      </button>
                    ) : null}
                  </td>
                </tr>
              );
            })}
            {!loading && rows.length === 0 ? (
              <tr>
                <td colSpan={15} className="px-4 py-8 text-center text-sm text-slate-500">
                  No students yet. Download the template, import a CSV, or add a row.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-500">
        {rows.length} student{rows.length === 1 ? "" : "s"}
        {dirtyCount ? ` · ${dirtyCount} unsaved` : ""}
      </p>
    </section>
  );
}
