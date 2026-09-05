"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  StudentShareCard,
  type StudentShareCardData,
} from "@/components/admin/StudentShareCard";
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
    dirty: false,
    isNew: false,
  };
}

const cell =
  "w-full min-w-0 border-0 bg-transparent px-1 py-1 text-xs text-slate-100 outline-none focus:bg-emerald-950/40";
const head =
  "sticky top-0 z-[1] whitespace-nowrap border-b border-emerald-800/50 bg-[#0c1a14] px-1.5 py-2 text-[10px] font-semibold uppercase tracking-wide text-emerald-200/90";

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
  const [shareCard, setShareCard] = useState<StudentShareCardData | null>(null);
  const [shareBusyId, setShareBusyId] = useState<string | null>(null);

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

  async function openRegistrationCard(studentId: string) {
    if (studentId.startsWith("new-")) return;
    setShareBusyId(studentId);
    setError(null);
    try {
      const r = await fetch(`/api/students/${studentId}`, { credentials: "include" });
      const j = (await r.json()) as {
        student?: StudentShareCardData & { error?: string };
        error?: string;
      };
      if (!r.ok || !j.student?.cardUrl) {
        throw new Error(j.error ?? j.student?.error ?? "Could not load student card");
      }
      const s = j.student;
      setShareCard({
        id: s.id,
        name: s.name,
        admissionNo: s.admissionNo,
        programmeCode: s.programmeCode,
        year: s.year,
        semester: s.semester,
        organizationName: s.organizationName,
        organizationSlug: s.organizationSlug,
        schoolPayCode: s.schoolPayCode,
        cardUrl: s.cardUrl,
        periodLabel: s.periodLabel ?? "Term",
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not open student card");
    } finally {
      setShareBusyId(null);
    }
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
        const j = (await r.json()) as {
          student?: StudentShareCardData;
          error?: string;
          details?: unknown;
        };
        if (!r.ok) {
          throw new Error(
            (j.error ?? "Create failed") +
              (j.details ? ` ${JSON.stringify(j.details)}` : ""),
          );
        }
        setNote(`Added ${row.name.trim()} to the register.`);
        if (j.student?.cardUrl) {
          setShareCard({
            ...j.student,
            periodLabel: j.student.periodLabel ?? "Term",
          });
        }
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

  function classCode(row: RegisterDraft) {
    return classes.find((c) => c.id === row.schoolClassId)?.code ?? "—";
  }

  function streamCode(row: RegisterDraft) {
    return (
      classes
        .find((c) => c.id === row.schoolClassId)
        ?.streams.find((s) => s.id === row.schoolStreamId)?.code ?? "—"
    );
  }

  function FieldEditors({ row }: { row: RegisterDraft }) {
    const streams = classes.find((c) => c.id === row.schoolClassId)?.streams ?? [];
    return (
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:contents">
        <label className="block text-[10px] text-slate-500 lg:contents">
          <span className="lg:hidden">Sex</span>
          <select
            value={row.sex}
            onChange={(e) => patchRow(row.id, { sex: e.target.value as RegisterDraft["sex"] })}
            className={`${cell} rounded border border-emerald-900/40 bg-black/20 lg:rounded-none lg:border-0 lg:border-r lg:bg-transparent`}
          >
            <option value="female">female</option>
            <option value="male">male</option>
            <option value="other">other</option>
          </select>
        </label>
        <label className="block text-[10px] text-slate-500 lg:contents">
          <span className="lg:hidden">Phone</span>
          <input
            value={row.phone}
            onChange={(e) => patchRow(row.id, { phone: e.target.value })}
            className={`${cell} rounded border border-emerald-900/40 bg-black/20 lg:rounded-none lg:border-0 lg:border-r lg:bg-transparent`}
          />
        </label>
        <label className="col-span-2 block text-[10px] text-slate-500 sm:col-span-1 lg:contents">
          <span className="lg:hidden">Email</span>
          <input
            value={row.email}
            onChange={(e) => patchRow(row.id, { email: e.target.value })}
            className={`${cell} rounded border border-emerald-900/40 bg-black/20 lg:rounded-none lg:border-0 lg:border-r lg:bg-transparent`}
          />
        </label>
        <label className="col-span-2 block text-[10px] text-slate-500 lg:contents">
          <span className="lg:hidden">Address</span>
          <input
            value={row.address}
            onChange={(e) => patchRow(row.id, { address: e.target.value })}
            className={`${cell} rounded border border-emerald-900/40 bg-black/20 lg:rounded-none lg:border-0 lg:border-r lg:bg-transparent`}
          />
        </label>
        <label className="block text-[10px] text-slate-500 lg:contents">
          <span className="lg:hidden">Telegram</span>
          <input
            value={row.telegramId}
            onChange={(e) => patchRow(row.id, { telegramId: e.target.value })}
            placeholder="chat id"
            className={`${cell} rounded border border-emerald-900/40 bg-black/20 lg:rounded-none lg:border-0 lg:border-r lg:bg-transparent`}
          />
        </label>
        <label className="block text-[10px] text-slate-500 lg:contents">
          <span className="lg:hidden">Class</span>
          <select
            value={row.schoolClassId}
            onChange={(e) =>
              patchRow(row.id, { schoolClassId: e.target.value, schoolStreamId: "" })
            }
            className={`${cell} rounded border border-emerald-900/40 bg-black/20 lg:rounded-none lg:border-0 lg:border-r lg:bg-transparent`}
          >
            <option value="">—</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-[10px] text-slate-500 lg:contents">
          <span className="lg:hidden">Stream</span>
          <select
            value={row.schoolStreamId}
            onChange={(e) => patchRow(row.id, { schoolStreamId: e.target.value })}
            disabled={!row.schoolClassId}
            className={`${cell} rounded border border-emerald-900/40 bg-black/20 lg:rounded-none lg:border-0 lg:border-r lg:bg-transparent`}
          >
            <option value="">—</option>
            {streams.map((s) => (
              <option key={s.id} value={s.id}>
                {s.code}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-[10px] text-slate-500 lg:contents">
          <span className="lg:hidden">Year</span>
          <select
            value={row.year}
            onChange={(e) => patchRow(row.id, { year: Number(e.target.value) })}
            className={`${cell} rounded border border-emerald-900/40 bg-black/20 lg:rounded-none lg:border-0 lg:border-r lg:bg-transparent`}
          >
            {[1, 2, 3, 4, 5, 6].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-[10px] text-slate-500 lg:contents">
          <span className="lg:hidden">Term</span>
          <input
            type="number"
            min={1}
            max={99}
            value={row.semester}
            onChange={(e) =>
              patchRow(row.id, { semester: Math.max(1, Number(e.target.value) || 1) })
            }
            className={`${cell} rounded border border-emerald-900/40 bg-black/20 lg:w-12 lg:rounded-none lg:border-0 lg:border-r lg:bg-transparent`}
          />
        </label>
      </div>
    );
  }

  return (
    <section className="min-w-0 max-w-full space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-emerald-100">Students register</h2>
          <p className="text-xs text-slate-400">
            Tap a student name to open registration details and QR card. Edit fields inline, then save.
          </p>
        </div>
        <div className="flex max-w-full flex-wrap gap-2 text-sm">
          <a
            href="/api/admin/school/students/export?template=1"
            className="rounded-lg border border-emerald-700/50 px-3 py-1.5 text-emerald-200 hover:bg-emerald-950/40"
          >
            Template
          </a>
          <a
            href="/api/admin/school/students/export"
            className="rounded-lg border border-emerald-700/50 px-3 py-1.5 text-emerald-200 hover:bg-emerald-950/40"
          >
            Export
          </a>
          <button
            type="button"
            onClick={onImportOpen}
            className="rounded-lg border border-violet-600/40 px-3 py-1.5 text-violet-200 hover:bg-violet-950/30"
          >
            Import
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
            className="!px-3 !py-1.5 text-sm"
          />
        </div>
      </div>

      {error ? <p className="text-sm text-rose-400">{error}</p> : null}
      {note ? <p className="text-sm text-emerald-300">{note}</p> : null}
      {loading ? <p className="text-xs text-slate-500">Loading register…</p> : null}

      {/* Mobile / tablet: stacked cards that fit the content column */}
      <div className="space-y-3 lg:hidden">
        {rows.map((row, idx) => (
          <article
            key={row.id}
            className={`min-w-0 rounded-xl border p-3 ${
              row.dirty ? "border-amber-500/40 bg-amber-950/20" : "border-emerald-800/40 bg-[#07140f]"
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="font-mono text-[10px] text-slate-500">#{idx + 1}</p>
                {!row.isNew ? (
                  <button
                    type="button"
                    onClick={() => void openRegistrationCard(row.id)}
                    disabled={shareBusyId === row.id}
                    className="mt-0.5 block w-full truncate text-left text-sm font-semibold text-sky-300 hover:underline disabled:opacity-50"
                  >
                    {shareBusyId === row.id ? "Opening card…" : row.name || "Unnamed student"}
                  </button>
                ) : (
                  <input
                    value={row.name}
                    onChange={(e) => patchRow(row.id, { name: e.target.value })}
                    placeholder="Full name"
                    className="mt-0.5 w-full rounded border border-emerald-900/40 bg-black/20 px-2 py-1.5 text-sm font-semibold text-white"
                  />
                )}
                <p className="mt-0.5 font-mono text-xs text-cyan-100/80">
                  {row.admissionNo || (row.isNew ? "auto on save" : "—")}
                  {!row.isNew ? ` · ${classCode(row)}/${streamCode(row)}` : null}
                </p>
              </div>
              <div className="flex shrink-0 flex-col gap-1">
                {!row.isNew ? (
                  <button
                    type="button"
                    onClick={() => void openRegistrationCard(row.id)}
                    className="rounded bg-cyan-800/70 px-2 py-1 text-[10px] font-semibold text-white"
                  >
                    QR card
                  </button>
                ) : null}
                <button
                  type="button"
                  disabled={busyId === row.id || !row.dirty}
                  onClick={() => void saveRow(row)}
                  className="rounded bg-emerald-700/80 px-2 py-1 text-[10px] font-semibold text-white disabled:opacity-40"
                >
                  {busyId === row.id ? "…" : row.dirty ? "Save →" : "OK"}
                </button>
                {!row.isNew ? (
                  <button
                    type="button"
                    onClick={() => onOpenActions({ id: row.id, name: row.name })}
                    className="text-[10px] font-semibold text-violet-300"
                  >
                    More
                  </button>
                ) : null}
              </div>
            </div>
            {!row.isNew ? (
              <input
                value={row.name}
                onChange={(e) => patchRow(row.id, { name: e.target.value })}
                className="mt-2 w-full rounded border border-emerald-900/40 bg-black/20 px-2 py-1.5 text-xs text-white"
                aria-label="Edit name"
              />
            ) : null}
            <input
              value={row.admissionNo}
              onChange={(e) => patchRow(row.id, { admissionNo: e.target.value })}
              placeholder="Admission no."
              className="mt-2 w-full rounded border border-emerald-900/40 bg-black/20 px-2 py-1.5 font-mono text-xs text-white"
            />
            <div className="mt-2">
              <FieldEditors row={row} />
            </div>
            <p className="mt-2 font-mono text-[10px] text-slate-500">
              Programme: {row.programmeCode || "—"}
            </p>
          </article>
        ))}
        {!loading && rows.length === 0 ? (
          <p className="rounded-xl border border-emerald-800/40 px-4 py-8 text-center text-sm text-slate-500">
            No students yet. Download the template, import a CSV, or add a row.
          </p>
        ) : null}
      </div>

      {/* Desktop: table constrained to content width with internal scroll */}
      <div className="hidden max-w-full overflow-x-auto rounded-xl border border-emerald-800/40 bg-[#07140f] shadow-inner lg:block">
        <table className="w-full min-w-[56rem] table-fixed border-collapse text-left">
          <colgroup>
            <col className="w-8" />
            <col className="w-[9%]" />
            <col className="w-[12%]" />
            <col className="w-[6%]" />
            <col className="w-[8%]" />
            <col className="w-[10%]" />
            <col className="w-[9%]" />
            <col className="w-[7%]" />
            <col className="w-[6%]" />
            <col className="w-[6%]" />
            <col className="w-[5%]" />
            <col className="w-[5%]" />
            <col className="w-[7%]" />
            <col className="w-[10%]" />
          </colgroup>
          <thead>
            <tr>
              <th className={head}>#</th>
              <th className={head}>Admission</th>
              <th className={head}>Name</th>
              <th className={head}>Sex</th>
              <th className={head}>Phone</th>
              <th className={head}>Email</th>
              <th className={head}>Address</th>
              <th className={head}>Telegram</th>
              <th className={head}>Class</th>
              <th className={head}>Stream</th>
              <th className={head}>Yr</th>
              <th className={head}>Term</th>
              <th className={head}>Prog</th>
              <th className={head}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => {
              const streams = classes.find((c) => c.id === row.schoolClassId)?.streams ?? [];
              return (
                <tr
                  key={row.id}
                  className={`border-b border-emerald-900/30 ${
                    row.dirty ? "bg-amber-950/20" : idx % 2 ? "bg-black/20" : ""
                  }`}
                >
                  <td className="px-1 py-1 font-mono text-[10px] text-slate-500">{idx + 1}</td>
                  <td className="border-r border-emerald-900/40 p-0">
                    <input
                      value={row.admissionNo}
                      onChange={(e) => patchRow(row.id, { admissionNo: e.target.value })}
                      className={`${cell} font-mono`}
                      placeholder="auto"
                    />
                  </td>
                  <td className="border-r border-emerald-900/40 p-0 align-top">
                    {!row.isNew ? (
                      <div className="flex flex-col gap-0.5 px-1 py-0.5">
                        <button
                          type="button"
                          title="Open registration card & QR"
                          onClick={() => void openRegistrationCard(row.id)}
                          className="truncate text-left text-xs font-semibold text-sky-300 hover:underline"
                        >
                          {shareBusyId === row.id ? "Opening…" : row.name || "View card"}
                        </button>
                        <input
                          value={row.name}
                          onChange={(e) => patchRow(row.id, { name: e.target.value })}
                          className={`${cell} text-[10px] text-slate-400`}
                          aria-label="Edit name"
                        />
                      </div>
                    ) : (
                      <input
                        value={row.name}
                        onChange={(e) => patchRow(row.id, { name: e.target.value })}
                        className={`${cell} font-medium`}
                        placeholder="Full name"
                      />
                    )}
                  </td>
                  <td className="border-r border-emerald-900/40 p-0">
                    <select
                      value={row.sex}
                      onChange={(e) =>
                        patchRow(row.id, { sex: e.target.value as RegisterDraft["sex"] })
                      }
                      className={cell}
                    >
                      <option value="female">F</option>
                      <option value="male">M</option>
                      <option value="other">O</option>
                    </select>
                  </td>
                  <td className="border-r border-emerald-900/40 p-0">
                    <input
                      value={row.phone}
                      onChange={(e) => patchRow(row.id, { phone: e.target.value })}
                      className={cell}
                    />
                  </td>
                  <td className="border-r border-emerald-900/40 p-0">
                    <input
                      value={row.email}
                      onChange={(e) => patchRow(row.id, { email: e.target.value })}
                      className={cell}
                    />
                  </td>
                  <td className="border-r border-emerald-900/40 p-0">
                    <input
                      value={row.address}
                      onChange={(e) => patchRow(row.id, { address: e.target.value })}
                      className={cell}
                    />
                  </td>
                  <td className="border-r border-emerald-900/40 p-0">
                    <input
                      value={row.telegramId}
                      onChange={(e) => patchRow(row.id, { telegramId: e.target.value })}
                      className={cell}
                    />
                  </td>
                  <td className="border-r border-emerald-900/40 p-0">
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
                  <td className="border-r border-emerald-900/40 p-0">
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
                  <td className="border-r border-emerald-900/40 p-0">
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
                  <td className="border-r border-emerald-900/40 p-0">
                    <input
                      type="number"
                      min={1}
                      max={99}
                      value={row.semester}
                      onChange={(e) =>
                        patchRow(row.id, {
                          semester: Math.max(1, Number(e.target.value) || 1),
                        })
                      }
                      className={cell}
                    />
                  </td>
                  <td className="truncate px-1 py-1 font-mono text-[10px] text-slate-500">
                    {row.programmeCode || "—"}
                  </td>
                  <td className="px-1 py-1">
                    <div className="flex flex-wrap gap-1">
                      {!row.isNew ? (
                        <button
                          type="button"
                          onClick={() => void openRegistrationCard(row.id)}
                          className="rounded bg-cyan-800/70 px-1.5 py-0.5 text-[10px] font-semibold text-white"
                        >
                          QR
                        </button>
                      ) : null}
                      <button
                        type="button"
                        disabled={busyId === row.id || !row.dirty}
                        onClick={() => void saveRow(row)}
                        className="rounded bg-emerald-700/80 px-1.5 py-0.5 text-[10px] font-semibold text-white disabled:opacity-40"
                      >
                        {busyId === row.id ? "…" : row.dirty ? "Save" : "OK"}
                      </button>
                      {!row.isNew ? (
                        <button
                          type="button"
                          onClick={() => onOpenActions({ id: row.id, name: row.name })}
                          className="text-[10px] font-semibold text-violet-300 hover:underline"
                        >
                          More
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })}
            {!loading && rows.length === 0 ? (
              <tr>
                <td colSpan={14} className="px-4 py-8 text-center text-sm text-slate-500">
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

      {shareCard ? (
        <StudentShareCard
          variant="modal"
          student={shareCard}
          onClose={() => setShareCard(null)}
        />
      ) : null}
    </section>
  );
}
