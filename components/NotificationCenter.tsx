// components/NotificationCenter.tsx
// In-app notification center: icon opens a panel listing active notifications

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { announcements } from '@/images';
import { triggerHapticFeedback } from '@/utils/ui';
import { getNotificationSeenIds, markNotificationsAsSeen } from '@/utils/notification-seen';

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  imageUrl?: string | null;
  videoUrl?: string | null;
  isActive: boolean;
  createdAt: string;
}

function getSeenIds() {
  return getNotificationSeenIds();
}

function markAsSeen(ids: string[]) {
  markNotificationsAsSeen(ids);
}

function playNotificationSound() {
  if (typeof window === 'undefined') return;
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.2);
  } catch {
    // ignore if AudioContext not supported or user interaction required
  }
}

export default function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [seenIds, setSeenIds] = useState<Set<string>>(() => getSeenIds());
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  // null = newest (first) is expanded; otherwise the id of the expanded older notification
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [brokenMediaIds, setBrokenMediaIds] = useState<Set<string>>(() => new Set());

  const prevUnreadRef = useRef(0);
  const [panelStyle, setPanelStyle] = useState<{ top: number; left: number; width: number }>({
    top: 56,
    left: 8,
    width: 320,
  });

  const newestNotificationId = notifications[0]?.id;
  // When notifications load or change, default to newest expanded
  useEffect(() => {
    setExpandedId(null);
  }, [notifications.length, newestNotificationId]);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/platform/notifications?hub=play', {
        credentials: 'include',
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' },
        signal: AbortSignal.timeout(8_000),
      });
      if (res.ok) {
        const data = (await res.json()) as { notifications?: Record<string, unknown>[] };
        const list = Array.isArray(data.notifications) ? data.notifications : [];
        const mapped = list.map((n) => ({
          id: String(n.id ?? ''),
          title: String(n.title ?? ''),
          body: String(n.body ?? ''),
          imageUrl: (n.imageUrl ?? null) as string | null,
          videoUrl: (n.videoUrl ?? null) as string | null,
          isActive: Boolean(n.isActive ?? true),
          createdAt: String(n.createdAt ?? ''),
        })) as NotificationItem[];
        setNotifications(mapped);
        const serverRead = list.filter((n) => Boolean(n.read)).map((n) => String(n.id ?? ''));
        if (serverRead.length > 0) {
          markAsSeen(serverRead);
          setSeenIds((prev) => {
            const next = new Set(prev);
            serverRead.forEach((id) => next.add(id));
            return next;
          });
        }
      }
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const unreadCount = notifications.filter((n) => !seenIds.has(n.id)).length;

  useEffect(() => {
    if (prevUnreadRef.current === 0 && unreadCount > 0) {
      playNotificationSound();
    }
    prevUnreadRef.current = unreadCount;
  }, [unreadCount]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    const id = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      void fetchNotifications();
    }, 90 * 1000);
    const onVisible = () => {
      if (!document.hidden) void fetchNotifications();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [fetchNotifications]);

  useEffect(() => {
    if (open) fetchNotifications();
  }, [open, fetchNotifications]);

  useEffect(() => {
    setSeenIds(getSeenIds());
  }, [notifications]);

  useEffect(() => {
    if (open && notifications.length > 0) {
      const ids = notifications.map((n) => n.id);
      markAsSeen(ids);
      setSeenIds((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.add(id));
        return next;
      });
      void fetch('/api/platform/notifications', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
    }
  }, [open, notifications]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [open]);

  const toggle = () => {
    triggerHapticFeedback(window);
    const willOpen = !open;
    if (willOpen && unreadCount > 0) playNotificationSound();
    setOpen((prev) => !prev);
  };

  useEffect(() => {
    if (!open) return;
    const updatePanelPosition = () => {
      const trigger = triggerRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const margin = 8;
      const width = Math.min(320, Math.max(260, viewportWidth - margin * 2));
      const preferredLeft = rect.right - width;
      const left = Math.min(
        Math.max(margin, preferredLeft),
        Math.max(margin, viewportWidth - width - margin)
      );
      setPanelStyle({
        top: Math.round(rect.bottom + 8),
        left: Math.round(left),
        width: Math.round(width),
      });
    };

    updatePanelPosition();
    window.addEventListener('resize', updatePanelPosition);
    window.addEventListener('scroll', updatePanelPosition, true);
    return () => {
      window.removeEventListener('resize', updatePanelPosition);
      window.removeEventListener('scroll', updatePanelPosition, true);
    };
  }, [open]);

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const now = new Date();
      const sameDay = d.toDateString() === now.toDateString();
      if (sameDay) {
        return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
      }
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
    } catch {
      return '';
    }
  };

  // Resolve relative URLs to absolute so images load in Telegram WebView / iframes
  const resolveMediaUrl = (url: string): string => {
    if (!url || typeof url !== 'string') return url;
    const trimmed = url.trim();
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
    if (typeof window !== 'undefined' && (trimmed.startsWith('/') || trimmed.startsWith('./'))) {
      const path = trimmed.startsWith('/') ? trimmed : trimmed.slice(1);
      return `${window.location.origin}${path.startsWith('/') ? path : `/${path}`}`;
    }
    return trimmed;
  };

  return (
    <div className="relative flex items-center" ref={panelRef}>
      <button
        ref={triggerRef}
        type="button"
        onClick={toggle}
        className="inline-flex h-8 w-8 items-center justify-center text-white focus:outline-none relative"
        aria-label="Notifications"
      >
        <Image src={announcements} alt="Notifications" width={24} height={24} className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] px-1 rounded-full bg-ura-gold text-black text-[10px] font-bold flex items-center justify-center" title="Unread notifications">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className="fixed max-h-[70vh] overflow-hidden rounded-xl border border-ura-border/85 bg-ura-panel shadow-xl z-[70] flex flex-col"
          style={{
            top: panelStyle.top,
            left: panelStyle.left,
            width: panelStyle.width,
          }}
        >
          <div className="p-3 border-b border-ura-border/85 flex items-center justify-between">
            <span className="font-semibold text-white">
              Notifications
              {unreadCount > 0 && (
                <span className="ml-2 text-xs font-normal text-gray-400">({unreadCount} unread)</span>
              )}
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-gray-400 hover:text-white p-1"
              aria-label="Close"
            >
              ×
            </button>
          </div>
          <div className="overflow-y-auto no-scrollbar flex-1">
            {loading ? (
              <div className="p-4 text-center text-gray-400 text-sm">Loading…</div>
            ) : notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-400 text-sm">No notifications</div>
            ) : (
              <ul className="divide-y divide-[#2d2f38]">
                {notifications.map((n, index) => {
                  const isNewest = index === 0;
                  const isExpanded = isNewest ? expandedId === null : expandedId === n.id;
                  const isTile = !isExpanded;

                  return (
                    <li key={n.id} className={isTile ? '' : 'p-3 hover:bg-ura-panel-2'}>
                      {isTile ? (
                        <button
                          type="button"
                          onClick={() => {
                            triggerHapticFeedback(window);
                            setExpandedId(isNewest ? null : n.id);
                          }}
                          className="w-full text-left px-3 py-2.5 hover:bg-ura-panel-2 flex items-center justify-between gap-2"
                        >
                          <span className="font-medium text-white text-sm truncate flex-1">{n.title}</span>
                          <span className="text-[10px] text-gray-500 flex-shrink-0">{formatDate(n.createdAt)}</span>
                        </button>
                      ) : (
                        <>
                          {n.imageUrl && !brokenMediaIds.has(n.id) && (
                            <div className="mb-2 rounded-lg overflow-hidden bg-ura-panel">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={resolveMediaUrl(n.imageUrl)}
                                alt=""
                                className="w-full max-h-40 object-cover"
                                loading="lazy"
                                onError={() =>
                                  setBrokenMediaIds((prev) => new Set(prev).add(n.id))
                                }
                              />
                            </div>
                          )}
                          {n.videoUrl && !brokenMediaIds.has(`${n.id}:video`) && (
                            <div className="mb-2 rounded-lg overflow-hidden bg-ura-panel">
                              <video
                                src={resolveMediaUrl(n.videoUrl)}
                                controls
                                className="w-full max-h-48"
                                preload="none"
                                playsInline
                                onError={() =>
                                  setBrokenMediaIds((prev) => new Set(prev).add(`${n.id}:video`))
                                }
                              />
                            </div>
                          )}
                          <div className="font-medium text-white text-sm">{n.title}</div>
                          {n.body ? (
                            <p className="text-gray-400 text-xs mt-1 whitespace-pre-wrap break-words">{n.body}</p>
                          ) : null}
                          <div className="text-[10px] text-gray-500 mt-1">{formatDate(n.createdAt)}</div>
                        </>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
