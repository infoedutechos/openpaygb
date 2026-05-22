// app/admin/telegram-broadcast/page.tsx
// Admin: send a message only to users' Telegram bot chats (no in-app notification, no user profiles).

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useToast } from '@/contexts/ToastContext';

export default function AdminTelegramBroadcastPage() {
  const showToast = useToast();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [topButtonText, setTopButtonText] = useState('');
  const [topButtonUrl, setTopButtonUrl] = useState('');
  const [link1Text, setLink1Text] = useState('Tap to Play');
  const [link1Url, setLink1Url] = useState('');
  const [link2Text, setLink2Text] = useState('Follow our Channel');
  const [link2Url, setLink2Url] = useState('');
  const [link3Text, setLink3Text] = useState('How to earn');
  const [link3Url, setLink3Url] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetch('/api/admin/clear-item-session', { method: 'POST', credentials: 'include' }).catch(() => {});
  }, []);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      showToast('Title is required', 'error');
      return;
    }
    setIsSubmitting(true);
    try {
      const rows: Array<Array<{ text: string; url: string }>> = [];
      if (topButtonText.trim() && topButtonUrl.trim()) {
        rows.push([{ text: topButtonText.trim(), url: topButtonUrl.trim() }]);
      }
      if (link1Text.trim() && link1Url.trim()) rows.push([{ text: link1Text.trim(), url: link1Url.trim() }]);
      if (link2Text.trim() && link2Url.trim()) rows.push([{ text: link2Text.trim(), url: link2Url.trim() }]);
      if (link3Text.trim() && link3Url.trim()) rows.push([{ text: link3Text.trim(), url: link3Url.trim() }]);
      const inlineKeyboard = rows.length ? rows : undefined;

      const res = await fetch('/api/admin/telegram-broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          body: body.trim(),
          imageUrl: imageUrl.trim() || undefined,
          inlineKeyboard,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send');
      showToast(`Sent to ${data.sentCount ?? 0} of ${data.totalUsers ?? 0} users`, 'success');
      setTitle('');
      setBody('');
      setImageUrl('');
      setTopButtonText('');
      setTopButtonUrl('');
      setLink1Url('');
      setLink2Url('');
      setLink3Url('');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to send', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-ura-panel text-white p-8">
      <div className="max-w-2xl mx-auto">
        <Link href="/admin" className="text-[#f3ba2f] hover:underline mb-4 inline-block">
          ← Back to Admin
        </Link>
        <h1 className="text-3xl font-bold text-[#f3ba2f] mb-2">Telegram broadcast</h1>
        <p className="text-gray-400 text-sm mb-6">
          Send a message <strong>only</strong> to each user&apos;s chat with your bot. This does <strong>not</strong> create an in-app notification and does <strong>not</strong> appear in user profiles or the notification center. Use this for &quot;PLAY NOW&quot;-style messages with link, inline button, and custom keyboard. <code className="bg-ura-navy/30 px-1 rounded">BOT_TOKEN</code> is required.
        </p>

        <section className="bg-ura-panel-2 rounded-xl p-6">
          <h2 className="text-xl font-semibold mb-4">Send to users&apos; Telegram chats</h2>
          <form onSubmit={handleSend} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Title *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. PLAY NOW"
                className="w-full bg-ura-panel border border-ura-border/75 rounded-lg px-3 py-2 text-white"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Body (optional)</label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder={'Short message. For a link, use the inline button below.'}
                rows={3}
                className="w-full bg-ura-panel border border-ura-border/75 rounded-lg px-3 py-2 text-white resize-none"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Image / logo (optional)</label>
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://yoursite.com/images/afro-lumens.png"
                className="w-full bg-ura-panel border border-ura-border/75 rounded-lg px-3 py-2 text-white"
              />
              <p className="text-xs text-gray-500 mt-0.5">Your Afro Lumens logo will appear above the message and Tap to Play buttons. Use a direct image URL (e.g. put the image in <code className="bg-ura-navy/30 px-1">public/images</code> and use your site URL + /images/filename.png).</p>
            </div>
            <div className="border-t border-ura-border/75 pt-4">
              <p className="text-sm text-gray-400 mb-2">Optional top button (e.g. VIEW CHANNEL)</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  value={topButtonText}
                  onChange={(e) => setTopButtonText(e.target.value)}
                  placeholder="e.g. VIEW CHANNEL"
                  className="bg-ura-panel border border-ura-border/75 rounded-lg px-3 py-2 text-white"
                />
                <input
                  type="url"
                  value={topButtonUrl}
                  onChange={(e) => setTopButtonUrl(e.target.value)}
                  placeholder="https://t.me/YourChannel"
                  className="bg-ura-panel border border-ura-border/75 rounded-lg px-3 py-2 text-white"
                />
              </div>
            </div>
            <div className="border-t border-ura-border/75 pt-4">
              <p className="text-sm font-medium text-white mb-1">Three full-width link buttons</p>
              <p className="text-xs text-gray-500 mb-3">One button per row so they appear big across the screen. Each opens a link when tapped.</p>
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={link1Text}
                    onChange={(e) => setLink1Text(e.target.value)}
                    placeholder="Tap to Play"
                    className="bg-ura-panel border border-ura-border/75 rounded-lg px-3 py-2 text-white"
                  />
                  <input
                    type="url"
                    value={link1Url}
                    onChange={(e) => setLink1Url(e.target.value)}
                    placeholder="https://t.me/YourBot/game?startapp=..."
                    className="bg-ura-panel border border-ura-border/75 rounded-lg px-3 py-2 text-white"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={link2Text}
                    onChange={(e) => setLink2Text(e.target.value)}
                    placeholder="Follow our Channel"
                    className="bg-ura-panel border border-ura-border/75 rounded-lg px-3 py-2 text-white"
                  />
                  <input
                    type="url"
                    value={link2Url}
                    onChange={(e) => setLink2Url(e.target.value)}
                    placeholder="https://t.me/YourChannel"
                    className="bg-ura-panel border border-ura-border/75 rounded-lg px-3 py-2 text-white"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={link3Text}
                    onChange={(e) => setLink3Text(e.target.value)}
                    placeholder="How to earn"
                    className="bg-ura-panel border border-ura-border/75 rounded-lg px-3 py-2 text-white"
                  />
                  <input
                    type="url"
                    value={link3Url}
                    onChange={(e) => setLink3Url(e.target.value)}
                    placeholder="https://..."
                    className="bg-ura-panel border border-ura-border/75 rounded-lg px-3 py-2 text-white"
                  />
                </div>
              </div>
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-ura-gold text-black py-3 rounded-lg font-bold disabled:opacity-50"
            >
              {isSubmitting ? 'Sending…' : 'Send to all users’ Telegram chats'}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
