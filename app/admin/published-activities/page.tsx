// Admin: published activity posts for the Earn tab “Activities” section (newest on top in the app)

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useToast } from '@/contexts/ToastContext';

type Row = {
  id: string;
  title: string;
  body: string;
  link: string | null;
  linkLabel: string | null;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
};

export default function AdminPublishedActivitiesPage() {
  const showToast = useToast();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [link, setLink] = useState('');
  const [linkLabel, setLinkLabel] = useState('Learn more');
  const [isPublished, setIsPublished] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/published-activities', { credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to load', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) {
      showToast('Title and body are required', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/published-activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: title.trim(),
          body: body.trim(),
          link: link.trim() || null,
          linkLabel: linkLabel.trim() || null,
          isPublished,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create');
      showToast('Activity created', 'success');
      setTitle('');
      setBody('');
      setLink('');
      setLinkLabel('Learn more');
      setIsPublished(true);
      void load();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const togglePublished = async (id: string, current: boolean) => {
    try {
      const res = await fetch(`/api/admin/published-activities/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ isPublished: !current }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed');
      }
      showToast(!current ? 'Published (visible in app)' : 'Unpublished', 'success');
      void load();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this activity post?')) return;
    try {
      const res = await fetch(`/api/admin/published-activities/${id}`, { method: 'DELETE', credentials: 'include' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed');
      }
      showToast('Deleted', 'success');
      void load();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-ura-panel text-white p-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <Link href="/admin" className="text-sm text-[#f3ba2f] hover:underline">
            ← Admin home
          </Link>
          <h1 className="text-3xl font-bold text-[#f3ba2f] mt-2">Published activities (Earn tab)</h1>
          <p className="text-gray-400 text-sm mt-2">
            These posts appear under <strong className="text-gray-200">Activities</strong> on the app Earn tab. Newest
            published posts show at the top. Only <strong className="text-gray-200">published</strong> rows are visible in
            the app — drafts stay here until you tap Publish on a row.
          </p>
        </div>

        <form onSubmit={handleCreate} className="rounded-xl border border-[#3a3d46] bg-ura-panel-2 p-4 space-y-3 mb-10">
          <h2 className="text-lg font-semibold">New activity</h2>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title"
            className="w-full rounded-lg border border-[#3a3d46] bg-ura-panel-2 px-3 py-2 text-sm"
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Body (plain text)"
            rows={4}
            className="w-full rounded-lg border border-[#3a3d46] bg-ura-panel-2 px-3 py-2 text-sm"
          />
          <input
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="Optional link URL"
            className="w-full rounded-lg border border-[#3a3d46] bg-ura-panel-2 px-3 py-2 text-sm"
          />
          <input
            value={linkLabel}
            onChange={(e) => setLinkLabel(e.target.value)}
            placeholder="Link button label"
            className="w-full rounded-lg border border-[#3a3d46] bg-ura-panel-2 px-3 py-2 text-sm"
          />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={isPublished} onChange={(e) => setIsPublished(e.target.checked)} />
            Publish immediately (visible in app)
          </label>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-ura-gold text-black px-4 py-2 text-sm font-semibold disabled:opacity-50"
          >
            {submitting ? 'Saving…' : 'Create activity'}
          </button>
        </form>

        <h2 className="text-lg font-semibold mb-3">All posts (newest first)</h2>
        {loading ? (
          <p className="text-gray-400">Loading…</p>
        ) : (
          <ul className="space-y-3">
            {rows.map((r) => (
              <li
                key={r.id}
                className="rounded-xl border border-[#3a3d46] bg-ura-panel-2 p-4 flex flex-col gap-2"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-bold text-white">{r.title}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(r.createdAt).toLocaleString()} · {r.isPublished ? 'Published' : 'Draft'}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => togglePublished(r.id, r.isPublished)}
                      className="text-xs px-2 py-1 rounded border border-[#f3ba2f] text-[#f3ba2f]"
                    >
                      {r.isPublished ? 'Unpublish' : 'Publish'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(r.id)}
                      className="text-xs px-2 py-1 rounded border border-red-500/60 text-red-300"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <p className="text-sm text-gray-300 whitespace-pre-wrap">{r.body}</p>
                {r.link ? (
                  <p className="text-xs text-cyan-300">
                    Link: {r.link} {r.linkLabel ? `(${r.linkLabel})` : ''}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
