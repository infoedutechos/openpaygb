// app/admin/notifications/page.tsx
// Admin: create and manage in-app notifications (shown in notification center)

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useToast } from '@/contexts/ToastContext';

interface NotificationRecord {
  id: string;
  title: string;
  body: string;
  imageUrl: string | null;
  videoUrl: string | null;
  isActive: boolean;
  createdAt: string;
}

export default function AdminNotificationsPage() {
  const showToast = useToast();
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [postToChannel, setPostToChannel] = useState(true);
  const [sendToUserBotChats, setSendToUserBotChats] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  // Edit modal
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editBody, setEditBody] = useState('');
  const [editImageUrl, setEditImageUrl] = useState('');
  const [editVideoUrl, setEditVideoUrl] = useState('');
  const [editUploadingImage, setEditUploadingImage] = useState(false);
  const [editUploadingVideo, setEditUploadingVideo] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [recallingId, setRecallingId] = useState<string | null>(null);

  // When landing on notifications (leaving a protected section), clear item password so re-entry asks again
  useEffect(() => {
    fetch('/api/admin/clear-item-session', { method: 'POST', credentials: 'include' }).catch(() => {});
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/notifications');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data ?? []);
      }
    } catch (e) {
      console.error(e);
      showToast('Failed to load notifications', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      showToast('Title is required', 'error');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/admin/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          body: body.trim(),
          imageUrl: imageUrl.trim() || undefined,
          videoUrl: videoUrl.trim() || undefined,
          isActive: true,
          postToTelegram: postToChannel,
          sendToUserBotChats,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create');
      showToast('Notification created', 'success');
      setTitle('');
      setBody('');
      setImageUrl('');
      setVideoUrl('');
      fetchNotifications();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to create', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleActive = async (id: string, current: boolean) => {
    try {
      const res = await fetch(`/api/admin/notifications/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !current }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed');
      }
      showToast(current ? 'Hidden from notification center' : 'Shown in notification center', 'success');
      fetchNotifications();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed', 'error');
    }
  };

  const handleRecall = async (id: string) => {
    if (!confirm('Delete this announcement from all users\' Telegram chats? The notification will stay in the list and in-app center.')) return;
    setRecallingId(id);
    try {
      const res = await fetch(`/api/admin/notifications/${id}/recall`, { method: 'POST', credentials: 'include' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as { error?: string }).error || 'Failed to recall');
      const msg = (data as { message?: string; deleted?: number }).message
        ?? ((data as { deleted?: number }).deleted != null ? `Removed from ${(data as { deleted: number }).deleted} user chats` : 'Recall completed');
      showToast(msg, 'success');
      fetchNotifications();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to recall', 'error');
    } finally {
      setRecallingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this notification?')) return;
    try {
      const res = await fetch(`/api/admin/notifications/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed');
      }
      showToast('Notification deleted', 'success');
      fetchNotifications();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed', 'error');
    }
  };

  const openEdit = (n: NotificationRecord) => {
    setEditingId(n.id);
    setEditTitle(n.title);
    setEditBody(n.body ?? '');
    setEditImageUrl(n.imageUrl ?? '');
    setEditVideoUrl(n.videoUrl ?? '');
  };

  const closeEdit = () => {
    setEditingId(null);
    setEditTitle('');
    setEditBody('');
    setEditImageUrl('');
    setEditVideoUrl('');
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId || !editTitle.trim()) {
      showToast('Title is required', 'error');
      return;
    }
    setIsSavingEdit(true);
    try {
      const res = await fetch(`/api/admin/notifications/${editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editTitle.trim(),
          body: editBody.trim(),
          imageUrl: editImageUrl.trim() || null,
          videoUrl: editVideoUrl.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update');
      showToast('Notification updated', 'success');
      closeEdit();
      fetchNotifications();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to update', 'error');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleEditImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setEditUploadingImage(true);
    e.target.value = '';
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/admin/notifications/upload', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      setEditImageUrl(data.url);
      showToast('Image uploaded', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Upload failed', 'error');
    } finally {
      setEditUploadingImage(false);
    }
  };

  const handleEditVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setEditUploadingVideo(true);
    e.target.value = '';
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/admin/notifications/upload', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      setEditVideoUrl(data.url);
      showToast('Video uploaded', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Upload failed', 'error');
    } finally {
      setEditUploadingVideo(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    e.target.value = '';
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/admin/notifications/upload', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      setImageUrl(data.url);
      showToast('Image uploaded', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Upload failed', 'error');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingVideo(true);
    e.target.value = '';
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/admin/notifications/upload', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      setVideoUrl(data.url);
      showToast('Video uploaded', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Upload failed', 'error');
    } finally {
      setUploadingVideo(false);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString(undefined, {
        dateStyle: 'short',
        timeStyle: 'short',
      });
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
        <h1 className="text-3xl font-bold text-[#f3ba2f] mb-2">Notifications</h1>
        <p className="text-gray-400 text-sm mb-6">
          Create notifications that appear in the <strong>in-app notification center</strong> (game screen, top bar) and on user profiles. Optionally post to your Telegram channel if <code className="bg-ura-navy/30 px-1 rounded">TELEGRAM_ANNOUNCEMENT_CHANNEL_ID</code> is set. To send a message only to users&apos; bot chats (with link/buttons, no profile), use <strong>Admin → Telegram broadcast</strong>.
        </p>
        <div className="bg-amber-900/20 border border-amber-700/50 rounded-lg p-3 mb-6 text-sm text-amber-200">
          <strong>Image tip:</strong> Use a <strong>direct image URL</strong> that ends in .jpg, .png, or .webp (e.g. <code className="bg-ura-navy/30 px-1 rounded">https://i.imgur.com/xxxxx.png</code>). Do <strong>not</strong> use album/page links like <code className="bg-ura-navy/30 px-1 rounded">imgur.com/a/...</code> — they won’t display. On Imgur: open the image, right‑click → “Copy image address”.
          <br />
          <strong>Recommended:</strong> 640×320 px, under 500 KB. Upload from PC only persists on servers with disk; use a hosted URL in production.
        </div>

        {/* Create form */}
        <section className="bg-ura-panel-2 rounded-xl p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Create notification</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Title *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. New feature: Market coming in Q2"
                className="w-full bg-ura-panel border border-ura-border/75 rounded-lg px-3 py-2 text-white"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Body (optional)</label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Short description or message..."
                rows={3}
                className="w-full bg-ura-panel border border-ura-border/75 rounded-lg px-3 py-2 text-white resize-none"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Image (optional)</label>
              <div className="flex gap-2 flex-wrap items-center">
                <input
                  type="text"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="URL or path (e.g. /uploads/notifications/… or upload from PC)"
                  className="w-full min-w-0 flex-1 sm:min-w-[200px] bg-ura-panel border border-ura-border/75 rounded-lg px-3 py-2 text-white"
                />
                <label className="cursor-pointer bg-[#3d4046] hover:bg-[#4d5056] text-white px-3 py-2 rounded-lg text-sm whitespace-nowrap disabled:opacity-50">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    className="sr-only"
                    onChange={handleImageUpload}
                    disabled={uploadingImage}
                  />
                  {uploadingImage ? 'Uploading…' : 'Upload from PC'}
                </label>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">Must be a direct image URL (e.g. https://i.imgur.com/xxx.png), not an album link (imgur.com/a/…). Recommended: 640×320 px, under 500 KB.</p>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Video (optional)</label>
              <div className="flex gap-2 flex-wrap items-center">
                <input
                  type="text"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="URL or path (e.g. /uploads/notifications/… or upload from PC)"
                  className="w-full min-w-0 flex-1 sm:min-w-[200px] bg-ura-panel border border-ura-border/75 rounded-lg px-3 py-2 text-white"
                />
                <label className="cursor-pointer bg-[#3d4046] hover:bg-[#4d5056] text-white px-3 py-2 rounded-lg text-sm whitespace-nowrap disabled:opacity-50">
                  <input
                    type="file"
                    accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
                    className="sr-only"
                    onChange={handleVideoUpload}
                    disabled={uploadingVideo}
                  />
                  {uploadingVideo ? 'Uploading…' : 'Upload from PC'}
                </label>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">MP4, WebM, MOV. Max 50 MB.</p>
            </div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={sendToUserBotChats}
                onChange={(e) => setSendToUserBotChats(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm text-gray-400">Send to each user&apos;s Telegram bot chat</span>
            </label>
            <p className="text-xs text-gray-500">When enabled, the notification appears in the in-app center, on user profiles, and in each user&apos;s chat with your bot.</p>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={postToChannel}
                onChange={(e) => setPostToChannel(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm text-gray-400">Also post to Telegram channel (if TELEGRAM_ANNOUNCEMENT_CHANNEL_ID is set)</span>
            </label>
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-ura-gold text-black px-4 py-2 rounded-lg font-medium disabled:opacity-50"
            >
              {isSubmitting ? 'Creating…' : 'Create notification'}
            </button>
          </form>
        </section>

        {/* List */}
        <section className="bg-ura-panel-2 rounded-xl p-6">
          <h2 className="text-xl font-semibold mb-4">All notifications</h2>
          {isLoading ? (
            <p className="text-gray-400">Loading…</p>
          ) : notifications.length === 0 ? (
            <p className="text-gray-400">No notifications yet. Create one above.</p>
          ) : (
            <ul className="space-y-3">
              {notifications.map((n) => (
                <li
                  key={n.id}
                  className="bg-ura-panel rounded-lg p-4 border border-ura-border/85 flex flex-wrap items-start justify-between gap-2"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-white">{n.title}</span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          n.isActive ? 'bg-green-900/50 text-green-300' : 'bg-gray-700 text-gray-400'
                        }`}
                      >
                        {n.isActive ? 'Visible' : 'Hidden'}
                      </span>
                    </div>
                    {n.body ? (
                      <p className="text-gray-400 text-sm mt-1 whitespace-pre-wrap line-clamp-2">{n.body}</p>
                    ) : null}
                    {(n.imageUrl || n.videoUrl) && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        {n.imageUrl && '🖼️ Image'}
                        {n.imageUrl && n.videoUrl && ' · '}
                        {n.videoUrl && '🎬 Video'}
                      </p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">{formatDate(n.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openEdit(n)}
                      className="text-sm bg-[#3d4046] hover:bg-[#4d5056] text-white px-3 py-1.5 rounded-lg"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleActive(n.id, n.isActive)}
                      className="text-sm bg-[#3d4046] hover:bg-[#4d5056] text-white px-3 py-1.5 rounded-lg"
                    >
                      {n.isActive ? 'Hide' : 'Show'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRecall(n.id)}
                      disabled={recallingId === n.id}
                      title="Remove this announcement from every user's Telegram chat (notification stays in list)"
                      className="text-sm bg-amber-900/50 hover:bg-amber-800/50 text-amber-200 px-3 py-1.5 rounded-lg disabled:opacity-50"
                    >
                      {recallingId === n.id ? '…' : "Delete from users' chats"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(n.id)}
                      className="text-sm bg-red-900/50 hover:bg-red-800/50 text-red-200 px-3 py-1.5 rounded-lg"
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Edit modal */}
        {editingId && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-ura-navy/70 p-0 sm:items-center sm:p-4">
            <div className="bg-ura-panel-2 rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-semibold mb-4">Edit notification</h2>
              <form onSubmit={handleSaveEdit} className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Title *</label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    placeholder="e.g. New feature"
                    className="w-full bg-ura-panel border border-ura-border/75 rounded-lg px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Body (optional)</label>
                  <textarea
                    value={editBody}
                    onChange={(e) => setEditBody(e.target.value)}
                    placeholder="Short description..."
                    rows={3}
                    className="w-full bg-ura-panel border border-ura-border/75 rounded-lg px-3 py-2 text-white resize-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Image (optional)</label>
                  <div className="flex gap-2 flex-wrap items-center">
                    <input
                      type="text"
                      value={editImageUrl}
                      onChange={(e) => setEditImageUrl(e.target.value)}
                      placeholder="Full URL (https://…) or upload from PC"
                      className="w-full min-w-0 flex-1 sm:min-w-[200px] bg-ura-panel border border-ura-border/75 rounded-lg px-3 py-2 text-white"
                    />
                    <label className="cursor-pointer bg-[#3d4046] hover:bg-[#4d5056] text-white px-3 py-2 rounded-lg text-sm whitespace-nowrap disabled:opacity-50">
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/gif,image/webp"
                        className="sr-only"
                        onChange={handleEditImageUpload}
                        disabled={editUploadingImage}
                      />
                      {editUploadingImage ? 'Uploading…' : 'Upload'}
                    </label>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">Recommended: 640×320 px, under 500 KB. Use full URL in production.</p>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Video (optional)</label>
                  <div className="flex gap-2 flex-wrap items-center">
                    <input
                      type="text"
                      value={editVideoUrl}
                      onChange={(e) => setEditVideoUrl(e.target.value)}
                      placeholder="URL or upload from PC"
                      className="w-full min-w-0 flex-1 sm:min-w-[200px] bg-ura-panel border border-ura-border/75 rounded-lg px-3 py-2 text-white"
                    />
                    <label className="cursor-pointer bg-[#3d4046] hover:bg-[#4d5056] text-white px-3 py-2 rounded-lg text-sm whitespace-nowrap disabled:opacity-50">
                      <input
                        type="file"
                        accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
                        className="sr-only"
                        onChange={handleEditVideoUpload}
                        disabled={editUploadingVideo}
                      />
                      {editUploadingVideo ? 'Uploading…' : 'Upload'}
                    </label>
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={isSavingEdit}
                    className="bg-ura-gold text-black px-4 py-2 rounded-lg font-medium disabled:opacity-50"
                  >
                    {isSavingEdit ? 'Saving…' : 'Save changes'}
                  </button>
                  <button
                    type="button"
                    onClick={closeEdit}
                    className="bg-[#3d4046] hover:bg-[#4d5056] text-white px-4 py-2 rounded-lg"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
