'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useToast } from '@/contexts/ToastContext';

type LearnCategoryRecord = {
  id: string;
  slug: string;
  title: string;
  icon: string;
  section: 'general' | 'tax-education';
  summary: string;
  topics: string[];
  lessons: Array<{ title: string; content: string }>;
  operations: string[];
  sortOrder: number;
  enabled: boolean;
};

const emptyForm = {
  id: '',
  slug: '',
  title: '',
  icon: 'i',
  section: 'tax-education' as 'general' | 'tax-education',
  summary: '',
  topicsText: '',
  lessonsText: '[\n  {\n    "title": "Lesson title",\n    "content": "Lesson content"\n  }\n]',
  operationsText: '',
  sortOrder: 0,
  enabled: true,
};

export default function AdminLearnPage() {
  const showToast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<LearnCategoryRecord[]>([]);
  const [form, setForm] = useState({ ...emptyForm });

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/learn', { credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to load');
      setCategories(Array.isArray(data.categories) ? data.categories : []);
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to load', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const setEditing = (item: LearnCategoryRecord) => {
    setForm({
      id: item.id,
      slug: item.slug,
      title: item.title,
      icon: item.icon || 'i',
      section: item.section ?? 'tax-education',
      summary: item.summary,
      topicsText: (item.topics ?? []).join(', '),
      lessonsText: JSON.stringify(item.lessons ?? [], null, 2),
      operationsText: (item.operations ?? []).join(', '),
      sortOrder: item.sortOrder ?? 0,
      enabled: item.enabled !== false,
    });
  };

  const resetForm = () => setForm({ ...emptyForm });

  const parseTopics = (text: string) => text.split(',').map((x) => x.trim()).filter(Boolean);

  const parseLessons = (text: string): Array<{ title: string; content: string }> => {
    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((x: unknown) => {
        const o = x as { title?: unknown; content?: unknown };
        return {
          title: String(o?.title ?? ''),
          content: String(o?.content ?? ''),
        };
      })
      .filter((x) => x.title.trim() && x.content.trim());
  };

  const saveForm = async () => {
    if (!form.slug.trim() || !form.title.trim() || !form.summary.trim()) {
      showToast('Slug, title, and summary are required', 'error');
      return;
    }
    let lessons: Array<{ title: string; content: string }> = [];
    try {
      lessons = parseLessons(form.lessonsText);
    } catch {
      showToast('Lessons JSON is invalid', 'error');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        action: form.id ? 'update' : 'create',
        id: form.id || undefined,
        slug: form.slug.trim().toLowerCase(),
        title: form.title.trim(),
        icon: form.icon.trim().slice(0, 4) || 'i',
        section: form.section,
        summary: form.summary.trim(),
        topics: parseTopics(form.topicsText),
        lessons,
        operations: parseTopics(form.operationsText),
        sortOrder: Number(form.sortOrder) || 0,
        enabled: form.enabled,
      };
      const res = await fetch('/api/admin/learn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to save');
      showToast(form.id ? 'Category updated' : 'Category created', 'success');
      resetForm();
      await fetchData();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to save', 'error');
    } finally {
      setSaving(false);
    }
  };

  const deleteCategory = async (id: string) => {
    if (!confirm('Delete this category?')) return;
    setSaving(true);
    try {
      const res = await fetch('/api/admin/learn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'delete', id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to delete');
      showToast('Category deleted', 'success');
      await fetchData();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to delete', 'error');
    } finally {
      setSaving(false);
    }
  };

  const seedDefaults = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/learn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'seed-defaults' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to seed');
      showToast(`Seeded ${data.seeded ?? 0} categories`, 'success');
      await fetchData();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to seed', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-ura-panel text-white p-8">
      <div className="max-w-5xl mx-auto">
        <Link href="/admin" className="text-[#f3ba2f] hover:underline mb-4 inline-block">← Back to Admin</Link>
        <h1 className="text-3xl font-bold text-[#f3ba2f] mb-2">Learn Content</h1>
        <p className="text-gray-400 mb-6">Manage Learn page categories and full-screen lessons from database content.</p>

        <div className="bg-ura-panel-2 p-5 rounded-xl mb-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Category editor</h2>
            <div className="flex gap-2">
              <button type="button" onClick={seedDefaults} disabled={saving} className="px-3 py-2 rounded-lg bg-[#3d4046] hover:bg-[#4d5056] text-sm disabled:opacity-50">Seed defaults</button>
              <button type="button" onClick={resetForm} className="px-3 py-2 rounded-lg bg-[#3d4046] hover:bg-[#4d5056] text-sm">New</button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
            <input value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))} placeholder="slug (e.g. general-tax)" className="bg-ura-panel border border-ura-border/75 rounded-lg px-3 py-2" />
            <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Title" className="bg-ura-panel border border-ura-border/75 rounded-lg px-3 py-2" />
            <input value={form.icon} onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))} placeholder="Icon letters" className="bg-ura-panel border border-ura-border/75 rounded-lg px-3 py-2" />
            <input type="number" value={form.sortOrder} onChange={(e) => setForm((f) => ({ ...f, sortOrder: Number(e.target.value) || 0 }))} placeholder="Sort order" className="bg-ura-panel border border-ura-border/75 rounded-lg px-3 py-2" />
            <select value={form.section} onChange={(e) => setForm((f) => ({ ...f, section: e.target.value as 'general' | 'tax-education' }))} className="bg-ura-panel border border-ura-border/75 rounded-lg px-3 py-2">
              <option value="general">General tab</option>
              <option value="tax-education">Tax Education tab</option>
            </select>
          </div>
          <textarea value={form.summary} onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))} placeholder="Summary" rows={2} className="mt-3 w-full bg-ura-panel border border-ura-border/75 rounded-lg px-3 py-2" />
          <textarea value={form.topicsText} onChange={(e) => setForm((f) => ({ ...f, topicsText: e.target.value }))} placeholder="Topics comma-separated" rows={2} className="mt-3 w-full bg-ura-panel border border-ura-border/75 rounded-lg px-3 py-2" />
          <textarea value={form.operationsText} onChange={(e) => setForm((f) => ({ ...f, operationsText: e.target.value }))} placeholder="Operations comma-separated (for General tab items)" rows={2} className="mt-3 w-full bg-ura-panel border border-ura-border/75 rounded-lg px-3 py-2" />
          <textarea value={form.lessonsText} onChange={(e) => setForm((f) => ({ ...f, lessonsText: e.target.value }))} placeholder='Lessons JSON [{"title":"...","content":"..."}]' rows={8} className="mt-3 w-full bg-ura-panel border border-ura-border/75 rounded-lg px-3 py-2 font-mono text-xs" />
          <label className="mt-3 flex items-center gap-2 text-sm text-gray-300">
            <input type="checkbox" checked={form.enabled} onChange={(e) => setForm((f) => ({ ...f, enabled: e.target.checked }))} />
            Enabled
          </label>
          <button type="button" onClick={saveForm} disabled={saving} className="mt-4 px-4 py-2 bg-ura-gold text-black font-semibold rounded-lg disabled:opacity-50">
            {saving ? 'Saving...' : form.id ? 'Update category' : 'Create category'}
          </button>
        </div>

        <div className="bg-ura-panel-2 rounded-xl overflow-hidden">
          <h2 className="p-4 text-lg font-semibold border-b border-ura-border/75">Categories ({categories.length})</h2>
          {loading ? (
            <p className="p-4 text-gray-400">Loading...</p>
          ) : (
            <div className="divide-y divide-[#3d4046]">
              {categories.map((item) => (
                <div key={item.id} className="p-4 flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{item.title} <span className="text-xs text-gray-400">({item.slug})</span></p>
                    <p className="text-xs text-gray-400 mt-1">{item.section === 'general' ? 'General tab' : 'Tax Education tab'} · Order {item.sortOrder} · {item.enabled ? 'Enabled' : 'Disabled'} · Topics {item.topics?.length ?? 0} · Lessons {item.lessons?.length ?? 0} · Operations {item.operations?.length ?? 0}</p>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setEditing(item)} className="px-3 py-1 rounded bg-[#3d4046] hover:bg-[#4d5056] text-sm">Edit</button>
                    <button type="button" onClick={() => deleteCategory(item.id)} className="px-3 py-1 rounded bg-red-600/80 hover:bg-red-600 text-sm">Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
