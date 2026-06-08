"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PlatformHub } from "@/lib/knowledge-base/types";
import { triggerHapticFeedback } from "@/utils/ui";

type NotificationRow = {
  id: string;
  title: string;
  body: string;
  imageUrl: string | null;
  videoUrl: string | null;
  href: string | null;
  createdAt: string;
  read: boolean;
};

export type PlatformNotificationBellProps = {
  hub?: PlatformHub;
};

function resolveMediaUrl(url: string): string {
  if (!url || typeof url !== "string") return url;
  const trimmed = url.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  if (typeof window !== "undefined" && trimmed.startsWith("/")) {
    return `${window.location.origin}${trimmed}`;
  }
  return trimmed;
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
    }
    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
  } catch {
    return "";
  }
}

export default function PlatformNotificationBell({ hub = "all" }: PlatformNotificationBellProps) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const unread = rows.filter((n) => !n.read).length;

  const fetchRows = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/platform/notifications?hub=${encodeURIComponent(hub)}`, {
        credentials: "include",
        cache: "no-store",
        signal: AbortSignal.timeout(8_000),
      });
      if (!res.ok) return;
      const data = (await res.json()) as { notifications?: NotificationRow[] };
      setRows(Array.isArray(data.notifications) ? data.notifications : []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [hub]);

  const markRead = useCallback(
    async (ids: string[]) => {
      if (!ids.length) return;
      try {
        await fetch("/api/platform/notifications", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids }),
        });
        setRows((prev) =>
          prev.map((n) => (ids.includes(n.id) ? { ...n, read: true } : n)),
        );
      } catch {
        /* ignore */
      }
    },
    [],
  );

  useEffect(() => {
    void fetchRows();
    const id = setInterval(() => void fetchRows(), 60_000);
    return () => clearInterval(id);
  }, [fetchRows]);

  useEffect(() => {
    if (open) void fetchRows();
  }, [open, fetchRows]);

  useEffect(() => {
    if (open && rows.length > 0) {
      const unreadIds = rows.filter((n) => !n.read).map((n) => n.id);
      void markRead(unreadIds);
    }
  }, [open, rows, markRead]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  return (
    <div
      ref={panelRef}
      className="pointer-events-auto fixed z-[85] top-[max(0.75rem,env(safe-area-inset-top,0px))] right-[max(1.25rem,env(safe-area-inset-right,0px))]"
    >
      <button
        type="button"
        onClick={() => {
          triggerHapticFeedback(window);
          setOpen((v) => !v);
        }}
        className="relative flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-[#14171c]/95 text-white shadow-lg hover:bg-[#1a1f28]"
        aria-label="Notifications"
        aria-expanded={open}
      >
        <span className="text-lg" aria-hidden>
          🔔
        </span>
        {unread > 0 ? (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-amber-400 text-[10px] font-bold text-slate-950 flex items-center justify-center">
            {unread > 99 ? "99+" : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 mt-2 w-[min(100vw-2rem,20rem)] max-h-[min(70vh,24rem)] overflow-hidden rounded-xl border border-white/10 bg-[#14171c] shadow-xl flex flex-col">
          <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
            <span className="text-sm font-semibold text-white">
              Notifications
              {unread > 0 ? (
                <span className="ml-1 text-xs font-normal text-slate-400">({unread} new)</span>
              ) : null}
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-slate-400 hover:text-white px-1"
              aria-label="Close"
            >
              ×
            </button>
          </div>
          <div className="overflow-y-auto flex-1">
            {loading && rows.length === 0 ? (
              <p className="p-4 text-center text-sm text-slate-400">Loading…</p>
            ) : rows.length === 0 ? (
              <p className="p-4 text-center text-sm text-slate-400">No notifications</p>
            ) : (
              <ul className="divide-y divide-white/5">
                {rows.map((n) => (
                  <li key={n.id} className="p-3 hover:bg-white/[0.04]">
                    {n.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={resolveMediaUrl(n.imageUrl)}
                        alt=""
                        className="mb-2 w-full max-h-32 rounded-lg object-cover"
                      />
                    ) : null}
                    {n.videoUrl ? (
                      <video
                        src={resolveMediaUrl(n.videoUrl)}
                        controls
                        className="mb-2 w-full max-h-36 rounded-lg"
                        preload="metadata"
                      />
                    ) : null}
                    {n.href ? (
                      <a
                        href={n.href}
                        className="block text-sm font-medium text-sky-200 hover:underline"
                        onClick={() => triggerHapticFeedback(window)}
                      >
                        {n.title}
                      </a>
                    ) : (
                      <p className="text-sm font-medium text-white">{n.title}</p>
                    )}
                    {n.body ? (
                      <p className="mt-1 text-xs text-slate-400 whitespace-pre-wrap">{n.body}</p>
                    ) : null}
                    <p className="mt-1 text-[10px] text-slate-600">{formatDate(n.createdAt)}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
