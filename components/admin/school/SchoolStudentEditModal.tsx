"use client";

import { useEffect, useState } from "react";
import { SchoolModalHeader } from "@/components/admin/school/SchoolModalHeader";
import { useSchoolAdminApi } from "@/hooks/useSchoolAdminApi";

type ClassOption = {
  id: string;
  code: string;
  streams: { id: string; code: string }[];
};

type Props = {
  studentId: string;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
};

export function SchoolStudentEditModal({ studentId, open, onClose, onSaved }: Props) {
  const { schoolFetch } = useSchoolAdminApi();
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [form, setForm] = useState({
    name: "",
    admissionNo: "",
    sex: "other",
    email: "",
    phone: "",
    address: "",
    schoolClassId: "",
    schoolStreamId: "",
  });
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setLoading(true);
    void (async () => {
      try {
        const [clsR, stuR] = await Promise.all([
          schoolFetch("/api/admin/school/classes", undefined, { allSessions: "1" }),
          fetch(`/api/students/${studentId}`, { credentials: "include" }),
        ]);
        if (clsR.ok) {
          const j = (await clsR.json()) as { classes?: ClassOption[] };
          setClasses(j.classes ?? []);
        }
        if (!stuR.ok) {
          const j = (await stuR.json()) as { error?: string };
          throw new Error(j.error ?? "Failed to load student");
        }
        const j = (await stuR.json()) as { student?: Record<string, string | null> };
        const s = j.student;
        if (!s) throw new Error("Student not found");
        setForm({
          name: s.name ?? "",
          admissionNo: s.admissionNo ?? "",
          sex: (s.sex as string) ?? "other",
          email: s.email ?? "",
          phone: s.phone ?? "",
          address: s.address ?? "",
          schoolClassId: s.schoolClassId ?? "",
          schoolStreamId: s.schoolStreamId ?? "",
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load student");
      } finally {
        setLoading(false);
      }
    })();
  }, [open, studentId, schoolFetch]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <form
        className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#0a101f] p-5"
        onSubmit={(e) => {
          e.preventDefault();
          void (async () => {
            setBusy(true);
            setError(null);
            try {
              const email = form.email.trim();
              const payload: Record<string, string> = {
                name: form.name.trim(),
                admissionNo: form.admissionNo.trim(),
                sex: form.sex,
                phone: form.phone.trim(),
                address: form.address.trim(),
                email: email,
              };
              if (form.schoolClassId && form.schoolStreamId) {
                payload.schoolClassId = form.schoolClassId;
                payload.schoolStreamId = form.schoolStreamId;
              }
              const r = await fetch(`/api/students/${studentId}`, {
                method: "PATCH",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
              });
              const j = (await r.json()) as { error?: string; details?: unknown };
              if (!r.ok) {
                const detail =
                  j.details && typeof j.details === "object" ? ` ${JSON.stringify(j.details)}` : "";
                throw new Error((j.error ?? "Save failed") + detail);
              }
              onSaved();
              onClose();
            } catch (err) {
              setError(err instanceof Error ? err.message : "Save failed");
            } finally {
              setBusy(false);
            }
          })();
        }}
      >
        <SchoolModalHeader onBack={onClose} title="Edit student" />
        {loading ? <p className="mt-3 text-sm text-slate-400">Loading…</p> : null}
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Name" className="rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-white sm:col-span-2" />
          <input value={form.admissionNo} onChange={(e) => setForm({ ...form, admissionNo: e.target.value })} placeholder="Admission no." className="rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-white" />
          <select value={form.sex} onChange={(e) => setForm({ ...form, sex: e.target.value })} className="rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-white">
            <option value="female">Female</option>
            <option value="male">Male</option>
            <option value="other">Other</option>
          </select>
          <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Phone" className="rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-white" />
          <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Email (optional)" className="rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-white" />
          <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Address" className="rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-white sm:col-span-2" />
          <select value={form.schoolClassId} onChange={(e) => setForm({ ...form, schoolClassId: e.target.value, schoolStreamId: "" })} className="rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-white">
            <option value="">Class</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>{c.code}</option>
            ))}
          </select>
          <select value={form.schoolStreamId} onChange={(e) => setForm({ ...form, schoolStreamId: e.target.value })} className="rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-white">
            <option value="">Stream</option>
            {(classes.find((c) => c.id === form.schoolClassId)?.streams ?? []).map((s) => (
              <option key={s.id} value={s.id}>{s.code}</option>
            ))}
          </select>
        </div>
        {error ? <p className="mt-2 text-sm text-rose-400">{error}</p> : null}
        <div className="mt-4 flex gap-2">
          <button type="submit" disabled={busy || loading} className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
            Save
          </button>
          <button type="button" onClick={onClose} className="rounded-lg border border-white/15 px-4 py-2 text-sm text-slate-300">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
