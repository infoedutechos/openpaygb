'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { roketicon } from '@/images';
import { triggerHapticFeedback } from '@/utils/ui';
import { getNotificationSeenIds, markNotificationsAsSeen } from '@/utils/notification-seen';
import type { NotificationItem } from '@/components/NotificationCenter';

function resolveMediaUrl(url: string): string {
  if (!url || typeof url !== 'string') return url;
  const trimmed = url.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  if (typeof window !== 'undefined' && (trimmed.startsWith('/') || trimmed.startsWith('./'))) {
    const path = trimmed.startsWith('/') ? trimmed : trimmed.slice(1);
    return `${window.location.origin}${path.startsWith('/') ? path : `/${path}`}`;
  }
  return trimmed;
}

export default function NotificationBanner() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [seenIds, setSeenIds] = useState<Set<string>>(() => getNotificationSeenIds());
  const [dismissedId, setDismissedId] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications', { cache: 'no-store', headers: { 'Cache-Control': 'no-cache' } });
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : [];
        setNotifications(
          list.map((n: Record<string, unknown>) => ({
            ...n,
            id: String(n.id ?? ''),
            title: String(n.title ?? ''),
            body: String(n.body ?? ''),
            imageUrl: (n.imageUrl ?? n.image_url ?? null) as string | null,
            videoUrl: (n.videoUrl ?? n.video_url ?? null) as string | null,
            isActive: Boolean(n.isActive ?? true),
            createdAt: String(n.createdAt ?? ''),
          })) as NotificationItem[]
        );
      }
    } catch {
      setNotifications([]);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    setSeenIds(getNotificationSeenIds());
  }, [notifications]);

  const unread = notifications.filter((n) => !seenIds.has(n.id) && n.id !== dismissedId);
  const showNotification = unread[0] ?? null;

  const handleDismiss = (id: string) => {
    triggerHapticFeedback(window);
    markNotificationsAsSeen([id]);
    setDismissedId(id);
    setSeenIds(getNotificationSeenIds());
  };

  if (!showNotification) return null;

  const imageUrl = showNotification.imageUrl ? resolveMediaUrl(showNotification.imageUrl) : null;

  return (
    <div className="px-4 pt-2 pb-1 flex flex-col items-center">
      {/* Hint: open the full list from the bell on Home (profile strip) */}
      <div className="flex justify-end w-full max-w-xl mb-0.5">
        <span className="text-[10px] text-gray-500 flex items-center gap-0.5" aria-hidden>
          <svg className="w-3.5 h-3.5 text-[#f3ba2f]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
          <span className="text-gray-400">Notifications</span>
        </span>
      </div>
      {/* Pill-shaped banner (dark theme, icon left, title + body, now + X) */}
      <div className="w-full max-w-xl rounded-2xl bg-ura-panel-2 border border-ura-border/75 shadow-lg flex items-center gap-3 px-3 py-2.5">
        <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-ura-panel flex items-center justify-center gap-0.5 overflow-hidden border border-ura-border/75">
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <>
              <Image src={roketicon} alt="" width={20} height={20} className="opacity-90 object-contain flex-shrink-0" />
              <span className="text-base leading-none flex-shrink-0" aria-hidden>🟡</span>
            </>
          )}
        </div>
        <div className="flex-1 min-w-0 py-0.5">
          <p className="font-bold text-white text-sm leading-tight truncate">
            {showNotification.title}
          </p>
          {showNotification.body ? (
            <p className="text-gray-400 text-xs leading-tight truncate mt-0.5">
              {showNotification.body}
            </p>
          ) : null}
        </div>
        <div className="flex-shrink-0 flex items-center gap-2">
          <span className="text-[10px] text-gray-500 whitespace-nowrap">now</span>
          <button
            type="button"
            onClick={() => handleDismiss(showNotification.id)}
            className="text-gray-400 hover:text-white p-1 rounded transition-colors"
            aria-label="Dismiss"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
