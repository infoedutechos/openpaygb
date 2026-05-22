'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import IceCube from '@/icons/IceCube';
import { getTaskImageSrc, pearlWhite } from '@/images';
import type { Task } from '@/utils/types';
import { formatNumber, triggerHapticFeedback } from '@/utils/ui';

export type PublishedActivityItem = {
  id: string;
  title: string;
  body: string;
  link: string | null;
  linkLabel: string | null;
  createdAt: string;
  /** Admin announcements vs earn tasks (tasks also appear under Activities for visibility) */
  kind?: 'post' | 'task';
  points?: number;
  category?: string;
  image?: string;
};

type Props = {
  /** @deprecated No longer sent; API is public read. Prop kept for call-site compatibility */
  initData?: string;
  /** When set with onOpenTask, task tiles open the earn task popup instead of only opening the external link */
  tasks?: Task[];
  onOpenTask?: (task: Task) => void;
};

function taskIdFromActivityItem(item: PublishedActivityItem): string | null {
  if (item.kind !== 'task' || !item.id.startsWith('task:')) return null;
  return item.id.slice('task:'.length);
}

export default function PublishedActivitiesFeed({ tasks = [], onOpenTask }: Props) {
  const [items, setItems] = useState<PublishedActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch('/api/published-activities', { cache: 'no-store' });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(typeof data?.error === 'string' ? data.error : 'Failed to load');
        if (!cancelled) setItems(Array.isArray(data?.activities) ? data.activities : []);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="mt-8 border-t border-ura-border/85 pt-6" aria-label="Published activities">
      <h2 className="text-lg font-bold text-white tracking-tight mb-1">Activities</h2>
      <p className="text-[11px] text-gray-500 mb-4">New updates appear at the top.</p>

      {loading ? (
        <p className="text-sm text-gray-500 py-4 text-center">Loading activities…</p>
      ) : error ? (
        <p className="text-sm text-rose-400/90 py-2">{error}</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-gray-500 py-3 rounded-xl border border-dashed border-ura-border/85 px-3 text-center">
          No updates yet. Admins can add announcements under Published activities or earn tasks under Manage
          tasks.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {items.map((item) => {
            if (item.kind !== 'task') {
              return (
                <article
                  key={item.id}
                  className="col-span-2 rounded-xl border border-ura-border/85 bg-[#141821] p-3 text-left shadow-sm"
                >
                  <h3 className="text-sm font-bold text-white leading-snug">{item.title}</h3>
                  <p className="text-xs text-gray-300 mt-2 whitespace-pre-wrap leading-relaxed">{item.body}</p>
                  <p className="text-[10px] text-gray-500 mt-2 tabular-nums">
                    {new Date(item.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                  </p>
                  {item.link ? (
                    <a
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => triggerHapticFeedback(window)}
                      className="mt-3 inline-flex items-center justify-center rounded-lg border border-cyan-500/50 bg-cyan-950/30 px-3 py-2 text-xs font-semibold text-cyan-200 hover:border-cyan-400"
                    >
                      {item.linkLabel || 'Open link'}
                    </a>
                  ) : null}
                </article>
              );
            }

            const rawId = taskIdFromActivityItem(item);
            const fullTask = rawId && tasks.length ? tasks.find((t) => t.id === rawId) : undefined;
            const isDone = Boolean(fullTask?.isCompleted);

            const onActivate = () => {
              triggerHapticFeedback(window);
              if (fullTask && onOpenTask) {
                onOpenTask(fullTask);
                return;
              }
              if (item.link) window.open(item.link, '_blank', 'noopener,noreferrer');
            };

            const imgSrc = getTaskImageSrc(item.image ?? fullTask?.image);

            return (
              <button
                key={item.id}
                type="button"
                onClick={onActivate}
                className={`rounded-xl border bg-gradient-to-br from-[#252836] to-[#1e2029] p-3 text-left shadow-lg hover:border-violet-500/45 active:scale-[0.99] transition-all flex flex-col min-h-[104px] ${
                  isDone ? 'border-emerald-500/45 ring-1 ring-emerald-500/20' : 'border-ura-border/85'
                }`}
              >
                <div className="flex items-start gap-2 flex-1 min-h-0">
                  <div className="w-10 h-10 rounded-lg bg-ura-panel-2 flex items-center justify-center shrink-0 border border-ura-border/85 overflow-hidden">
                    {imgSrc ? (
                      <Image src={imgSrc} alt="" width={36} height={36} className="object-cover w-9 h-9 rounded-md" />
                    ) : (
                      <IceCube className="w-5 h-5 text-[#f3ba2f]" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-bold text-white leading-snug line-clamp-3">{item.title}</p>
                    {typeof item.points === 'number' ? (
                      <div className="flex items-center gap-1 mt-1.5 flex-nowrap">
                        <Image
                          src={pearlWhite}
                          alt=""
                          width={14}
                          height={14}
                          className="h-3.5 w-3.5 shrink-0 object-contain"
                        />
                        <span className="text-[11px] font-semibold text-[#f3ba2f] whitespace-nowrap">
                          +{formatNumber(item.points)} pearls
                        </span>
                      </div>
                    ) : null}
                  </div>
                  <span className="shrink-0 mt-0.5 flex flex-col items-center" aria-hidden>
                    {isDone ? (
                      <span
                        className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center"
                        title="Completed"
                      >
                        <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M5 13l4 4L19 7" />
                        </svg>
                      </span>
                    ) : (
                      <span className="text-gray-500 text-lg leading-none">›</span>
                    )}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
