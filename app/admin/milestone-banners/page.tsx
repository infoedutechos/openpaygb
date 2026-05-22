// app/admin/milestone-banners/page.tsx
// Admin: create and manage milestone / congratulations banners (shown once on main screen)

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useToast } from '@/contexts/ToastContext';

interface MilestoneBannerRecord {
  id: string;
  title: string;
  subtitle: string;
  body: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const DEFAULT_SUBTITLE = "We've reached the milestone of 6,800 players.";
const DEFAULT_BODY =
  'Your participation is valuable and recognised. Thank you for being part of Lumina network State in Formation—the reward will be worthwhile.';

export default function AdminMilestoneBannersPage() {
  const showToast = useToast();
  const [banners, setBanners] = useState<MilestoneBannerRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [body, setBody] = useState('');
  const [isActive, setIsActive] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editSubtitle, setEditSubtitle] = useState('');
  const [editBody, setEditBody] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  useEffect(() => {
    fetch('/api/admin/clear-item-session', { method: 'POST', credentials: 'include' }).catch(() => {});
  }, []);

  const fetchBanners = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/milestone-banners', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setBanners(data ?? []);
      } else {
        showToast('Failed to load milestone banners', 'error');
      }
    } catch (e) {
      console.error(e);
      showToast('Failed to load milestone banners', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchBanners();
  }, [fetchBanners]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      showToast('Title is required', 'error');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/admin/milestone-banners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          subtitle: (subtitle || '').trim(),
          body: (body || '').trim(),
          isActive,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create');
      showToast('Milestone banner created', 'success');
      setTitle('');
      setSubtitle('');
      setBody('');
      setIsActive(false);
      fetchBanners();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to create', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleActive = async (id: string, current: boolean) => {
    try {
      const res = await fetch(`/api/admin/milestone-banners/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !current }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed');
      }
      showToast(current ? 'Banner unpublished' : 'Banner published (shown once per user)', 'success');
      fetchBanners();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this milestone banner?')) return;
    try {
      const res = await fetch(`/api/admin/milestone-banners/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed');
      }
      showToast('Banner deleted', 'success');
      if (editingId === id) setEditingId(null);
      fetchBanners();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to delete', 'error');
    }
  };

  const openEdit = (b: MilestoneBannerRecord) => {
    setEditingId(b.id);
    setEditTitle(b.title);
    setEditSubtitle(b.subtitle ?? '');
    setEditBody(b.body ?? '');
  };

  const closeEdit = () => {
    setEditingId(null);
    setEditTitle('');
    setEditSubtitle('');
    setEditBody('');
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId || !editTitle.trim()) {
      showToast('Title is required', 'error');
      return;
    }
    setIsSavingEdit(true);
    try {
      const res = await fetch(`/api/admin/milestone-banners/${editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editTitle.trim(),
          subtitle: (editSubtitle || '').trim(),
          body: (editBody || '').trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update');
      showToast('Banner updated', 'success');
      closeEdit();
      fetchBanners();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to update', 'error');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="min-h-screen bg-ura-panel text-white p-8">
      <div className="max-w-4xl mx-auto">
        <Link href="/admin" className="text-[#f3ba2f] hover:underline mb-4 inline-block">
          ← Back to Admin
        </Link>
        <h1 className="text-3xl font-bold text-[#f3ba2f] mb-2">Milestone / Congratulations Banners</h1>
        <p className="text-gray-400 text-sm mb-6">
          Create and publish banners that appear <strong>once</strong> on the main game screen when a user opens the app. Use them for player milestones (e.g. 6,800 players), product launches, or other announcements. Only one banner can be active at a time.
        </p>

        <section className="bg-ura-panel-2 rounded-xl p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Create new banner</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Title *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Congratulations!"
                className="w-full bg-ura-panel border border-ura-border/75 rounded-lg px-3 py-2 text-white"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Subtitle</label>
              <input
                type="text"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                placeholder={DEFAULT_SUBTITLE}
                className="w-full bg-ura-panel border border-ura-border/75 rounded-lg px-3 py-2 text-white"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Body message</label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder={DEFAULT_BODY}
                rows={4}
                className="w-full bg-ura-panel border border-ura-border/75 rounded-lg px-3 py-2 text-white resize-y"
              />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="rounded border-gray-500"
              />
              <span className="text-sm text-gray-300">Publish immediately (set as active)</span>
            </label>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg bg-ura-gold text-black font-medium disabled:opacity-50"
            >
              {isSubmitting ? 'Creating…' : 'Create banner'}
            </button>
          </form>
        </section>

        <section className="bg-ura-panel-2 rounded-xl p-6">
          <h2 className="text-xl font-semibold mb-4">Existing banners</h2>
          {isLoading ? (
            <p className="text-gray-400">Loading…</p>
          ) : banners.length === 0 ? (
            <p className="text-gray-400">No milestone banners yet. Create one above.</p>
          ) : (
            <ul className="space-y-4">
              {banners.map((b) => (
                <li
                  key={b.id}
                  className={`border rounded-lg p-4 ${b.isActive ? 'border-[#f3ba2f]/50 bg-ura-gold/5' : 'border-ura-border/75'}`}
                >
                  {editingId === b.id ? (
                    <form onSubmit={handleSaveEdit} className="space-y-3">
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        placeholder="Title"
                        className="w-full bg-ura-panel border border-ura-border/75 rounded-lg px-3 py-2 text-white text-sm"
                      />
                      <input
                        type="text"
                        value={editSubtitle}
                        onChange={(e) => setEditSubtitle(e.target.value)}
                        placeholder="Subtitle"
                        className="w-full bg-ura-panel border border-ura-border/75 rounded-lg px-3 py-2 text-white text-sm"
                      />
                      <textarea
                        value={editBody}
                        onChange={(e) => setEditBody(e.target.value)}
                        placeholder="Body"
                        rows={3}
                        className="w-full bg-ura-panel border border-ura-border/75 rounded-lg px-3 py-2 text-white text-sm resize-y"
                      />
                      <div className="flex gap-2">
                        <button
                          type="submit"
                          disabled={isSavingEdit}
                          className="px-3 py-1.5 rounded bg-ura-gold text-black text-sm font-medium disabled:opacity-50"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={closeEdit}
                          className="px-3 py-1.5 rounded bg-[#3d4046] text-white text-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="font-semibold text-white">{b.title}</span>
                          {b.isActive && (
                            <span className="ml-2 text-xs px-2 py-0.5 rounded bg-ura-gold/20 text-[#f3ba2f]">
                              Active
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button
                            type="button"
                            onClick={() => toggleActive(b.id, b.isActive)}
                            className="text-xs px-2 py-1 rounded bg-[#3d4046] hover:bg-[#4d5056] text-white"
                          >
                            {b.isActive ? 'Unpublish' : 'Publish'}
                          </button>
                          <button
                            type="button"
                            onClick={() => openEdit(b)}
                            className="text-xs px-2 py-1 rounded bg-[#3d4046] hover:bg-[#4d5056] text-white"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(b.id)}
                            className="text-xs px-2 py-1 rounded bg-red-900/50 hover:bg-red-800/50 text-red-200"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                      {b.subtitle && (
                        <p className="text-sm text-[#f3ba2f] mt-1">{b.subtitle}</p>
                      )}
                      {b.body && (
                        <p className="text-sm text-gray-400 mt-1 line-clamp-2">{b.body}</p>
                      )}
                      <p className="text-xs text-gray-500 mt-2">Updated {formatDate(b.updatedAt)}</p>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
