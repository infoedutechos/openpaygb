"use client";

import { useCallback, useEffect, useState } from "react";

type Item = { id: string; name: string; availableQty: number; unavailableQty: number; notes: string };

export default function SchoolInventoryPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [form, setForm] = useState({ name: "", availableQty: 0, unavailableQty: 0, notes: "" });
  const [editId, setEditId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await fetch("/api/admin/school/inventory", { credentials: "include" });
    if (!r.ok) return;
    const j = (await r.json()) as { items?: Item[] };
    setItems(j.items ?? []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Inventory</h1>
        <p className="text-sm text-slate-400">Track available and unavailable item types.</p>
      </div>

      <form
        className="grid gap-2 rounded-xl border border-white/10 bg-[#0a101f] p-4 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          void (async () => {
            const url = editId ? `/api/admin/school/inventory/${editId}` : "/api/admin/school/inventory";
            const method = editId ? "PATCH" : "POST";
            await fetch(url, {
              method,
              credentials: "include",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(form),
            });
            setForm({ name: "", availableQty: 0, unavailableQty: 0, notes: "" });
            setEditId(null);
            await load();
          })();
        }}
      >
        <input placeholder="Item name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-white sm:col-span-2" />
        <input type="number" placeholder="Available qty" value={form.availableQty || ""} onChange={(e) => setForm({ ...form, availableQty: Number(e.target.value) })} className="rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-white" />
        <input type="number" placeholder="Unavailable qty" value={form.unavailableQty || ""} onChange={(e) => setForm({ ...form, unavailableQty: Number(e.target.value) })} className="rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-white" />
        <input placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-white sm:col-span-2" />
        <button type="submit" className="sm:col-span-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white">
          {editId ? "Update item" : "Add item"}
        </button>
      </form>

      <div className="space-y-3 md:hidden">
        {items.map((i) => (
          <article key={i.id} className="rounded-xl border border-white/10 bg-[#0a101f] p-4 text-sm text-slate-200">
            <p className="font-medium text-white">{i.name}</p>
            <p className="mt-2 text-xs text-slate-400">Available: {i.availableQty} · Unavailable: {i.unavailableQty}</p>
            <p className="mt-1 text-xs text-slate-500">{i.notes || "—"}</p>
            <div className="mt-3 flex gap-3">
              <button type="button" className="text-xs text-amber-300" onClick={() => { setEditId(i.id); setForm({ name: i.name, availableQty: i.availableQty, unavailableQty: i.unavailableQty, notes: i.notes }); }}>Edit</button>
              <button type="button" className="text-xs text-rose-300" onClick={() => void fetch(`/api/admin/school/inventory/${i.id}`, { method: "DELETE", credentials: "include" }).then(() => load())}>Delete</button>
            </div>
          </article>
        ))}
      </div>

      <div className="hidden overflow-x-auto rounded-xl border border-white/10 md:block">
        <table className="min-w-full text-sm">
          <thead className="bg-white/5 text-left text-slate-400">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Available</th>
              <th className="px-4 py-2">Unavailable</th>
              <th className="px-4 py-2">Notes</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {items.map((i) => (
              <tr key={i.id} className="border-t border-white/10 text-slate-200">
                <td className="px-4 py-2">{i.name}</td>
                <td className="px-4 py-2">{i.availableQty}</td>
                <td className="px-4 py-2">{i.unavailableQty}</td>
                <td className="px-4 py-2 text-slate-400">{i.notes || "—"}</td>
                <td className="px-4 py-2 text-right space-x-2">
                  <button type="button" className="text-xs text-amber-300" onClick={() => { setEditId(i.id); setForm({ name: i.name, availableQty: i.availableQty, unavailableQty: i.unavailableQty, notes: i.notes }); }}>Edit</button>
                  <button type="button" className="text-xs text-rose-300" onClick={() => void fetch(`/api/admin/school/inventory/${i.id}`, { method: "DELETE", credentials: "include" }).then(() => load())}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
