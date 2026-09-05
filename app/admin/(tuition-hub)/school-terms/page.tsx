"use client";

import { useCallback, useEffect, useState } from "react";
import { useSchoolAdminApi } from "@/hooks/useSchoolAdminApi";

type Term = { id: string; label: string; termNumber: number; isActive: boolean };

type Mode = "hub" | "new" | "edit" | "activate" | "delete";

export default function SchoolSetTermsPage() {
  const { schoolFetch, organizationSlug } = useSchoolAdminApi();
  const [terms, setTerms] = useState<Term[]>([]);
  const [mode, setMode] = useState<Mode>("hub");
  const [label, setLabel] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [activateId, setActivateId] = useState("");
  const [deleteId, setDeleteId] = useState("");

  const load = useCallback(async () => {
    const r = await schoolFetch("/api/admin/school/terms");
    if (!r.ok) return;
    const j = (await r.json()) as { terms?: Term[] };
    setTerms(j.terms ?? []);
  }, [schoolFetch]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Set Terms</h1>
        <p className="text-sm text-slate-400">
          Create, edit, activate, or delete academic terms — same workflow as Session. Labels are fully
          customisable (e.g. Term 1, June–August, First Term).
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { key: "new" as const, title: "New term", color: "bg-violet-900/40 hover:bg-violet-900/60" },
          { key: "edit" as const, title: "Edit term", color: "bg-orange-900/40 hover:bg-orange-900/60" },
          { key: "activate" as const, title: "Activate term", color: "bg-emerald-900/40 hover:bg-emerald-900/60" },
          { key: "delete" as const, title: "Delete term", color: "bg-rose-900/40 hover:bg-rose-900/60" },
        ].map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setMode(t.key)}
            className={`rounded-2xl border border-white/10 p-6 text-center transition ${t.color} ${mode === t.key ? "ring-2 ring-white/30" : ""}`}
          >
            <p className="text-sm font-semibold text-white">{t.title}</p>
          </button>
        ))}
      </div>

      {mode === "new" ? (
        <form
          className="max-w-md space-y-3 rounded-xl border border-white/10 bg-[#0a101f] p-4"
          onSubmit={(e) => {
            e.preventDefault();
            void (async () => {
              await schoolFetch("/api/admin/school/terms", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ label, activate: true, organizationSlug }),
              });
              setLabel("");
              setMode("hub");
              await load();
            })();
          }}
        >
          <h2 className="font-medium text-white">New term</h2>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="June–August"
            required
            className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-white"
          />
          <button type="submit" className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white">
            Add & activate
          </button>
        </form>
      ) : null}

      {mode === "edit" ? (
        <div className="max-w-md space-y-3 rounded-xl border border-white/10 bg-[#0a101f] p-4">
          <h2 className="font-medium text-white">Edit term</h2>
          <select
            value={editId ?? ""}
            onChange={(e) => {
              setEditId(e.target.value);
              setEditLabel(terms.find((t) => t.id === e.target.value)?.label ?? "");
            }}
            className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-white"
          >
            <option value="">Select term</option>
            {terms.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label} (#{t.termNumber})
              </option>
            ))}
          </select>
          {editId ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void schoolFetch(`/api/admin/school/terms/${editId}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ label: editLabel, organizationSlug }),
                }).then(() => {
                  setMode("hub");
                  void load();
                });
              }}
              className="flex gap-2"
            >
              <input
                value={editLabel}
                onChange={(e) => setEditLabel(e.target.value)}
                className="flex-1 rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-white"
              />
              <button type="submit" className="rounded-lg bg-orange-700 px-3 py-2 text-sm text-white">
                Save
              </button>
            </form>
          ) : null}
        </div>
      ) : null}

      {mode === "activate" ? (
        <div className="max-w-md space-y-3 rounded-xl border border-white/10 bg-[#0a101f] p-4">
          <h2 className="font-medium text-white">Activate term</h2>
          <select
            value={activateId}
            onChange={(e) => setActivateId(e.target.value)}
            className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-white"
          >
            <option value="">Select term</option>
            {terms
              .filter((t) => !t.isActive)
              .map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
          </select>
          <button
            type="button"
            disabled={!activateId}
            onClick={() =>
              void schoolFetch(`/api/admin/school/terms/${activateId}/activate`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ organizationSlug }),
              }).then(() => {
                setMode("hub");
                void load();
              })
            }
            className="rounded-lg bg-emerald-700 px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            Activate
          </button>
        </div>
      ) : null}

      {mode === "delete" ? (
        <div className="max-w-md space-y-3 rounded-xl border border-white/10 bg-[#0a101f] p-4">
          <h2 className="font-medium text-white">Delete term</h2>
          <select
            value={deleteId}
            onChange={(e) => setDeleteId(e.target.value)}
            className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-white"
          >
            <option value="">Select inactive term</option>
            {terms
              .filter((t) => !t.isActive)
              .map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
          </select>
          <button
            type="button"
            disabled={!deleteId}
            onClick={() => {
              if (confirm("Delete this term?"))
                void schoolFetch(`/api/admin/school/terms/${deleteId}`, { method: "DELETE" }).then(() => {
                  setMode("hub");
                  void load();
                });
            }}
            className="rounded-lg bg-rose-700 px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            Delete
          </button>
        </div>
      ) : null}

      <div className="rounded-xl border border-white/10 bg-[#0a101f] p-4">
        <h2 className="font-medium text-white">All terms</h2>
        <ul className="mt-3 space-y-2">
          {terms.map((t) => (
            <li
              key={t.id}
              className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-300"
            >
              <span className={t.isActive ? "font-semibold text-emerald-300" : ""}>{t.label}</span>
              <span className="text-xs text-slate-500">#{t.termNumber}</span>
              {t.isActive ? <span className="text-xs text-emerald-400">Active</span> : null}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
