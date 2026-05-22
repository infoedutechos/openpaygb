'use client';

import { useCallback, useEffect, useState } from 'react';
import UraStadiumPageHero from '@/components/UraStadiumPageHero';
import { navLearn } from '@/images';
import { useGameStore } from '@/utils/game-mechanics';
import { triggerHapticFeedback } from '@/utils/ui';
import { useToast } from '@/contexts/ToastContext';

export type TvProgramPublic = {
  id: string;
  title: string;
  description: string | null;
  youtubeUrl: string;
  embedUrl: string | null;
  scheduledAt: string | null;
};

type CommentRow = {
  id: string;
  authorName: string | null;
  body: string;
  createdAt: string;
};

interface UraTvPageProps {
  setCurrentView: (view: string) => void;
}

function formatWhen(iso: string | null): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

export default function UraTvPage({ setCurrentView }: UraTvPageProps) {
  const showToast = useToast();
  const userTelegramInitData = useGameStore((s) => s.userTelegramInitData);
  const [upcoming, setUpcoming] = useState<TvProgramPublic[]>([]);
  const [past, setPast] = useState<TvProgramPublic[]>([]);
  const [listTab, setListTab] = useState<'upcoming' | 'library'>('upcoming');
  const [loading, setLoading] = useState(true);
  const [activeProgram, setActiveProgram] = useState<TvProgramPublic | null>(null);
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [draft, setDraft] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadPrograms = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/tv-programs');
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof data.error === 'string' ? data.error : 'Failed to load');
      setUpcoming(Array.isArray(data.upcoming) ? data.upcoming : []);
      setPast(Array.isArray(data.past) ? data.past : []);
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Could not load URA TV', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void loadPrograms();
  }, [loadPrograms]);

  const loadComments = useCallback(
    async (programId: string) => {
      setCommentsLoading(true);
      try {
        const res = await fetch(`/api/tv-programs/${programId}/comments`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(typeof data.error === 'string' ? data.error : 'Failed');
        setComments(Array.isArray(data.comments) ? data.comments : []);
      } catch {
        setComments([]);
      } finally {
        setCommentsLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (!activeProgram) {
      setComments([]);
      setDraft('');
      return;
    }
    void loadComments(activeProgram.id);
  }, [activeProgram, loadComments]);

  const submitSuggestion = async () => {
    if (!activeProgram) return;
    const text = draft.trim();
    if (!text) {
      showToast('Write your comment or suggestion first.', 'error');
      return;
    }
    if (!userTelegramInitData) {
      showToast('Open URAPearls from Telegram to send feedback.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/tv-programs/${activeProgram.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData: userTelegramInitData, body: text }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof data.error === 'string' ? data.error : 'Send failed');
      if (data.comment) {
        setComments((prev) => [data.comment as CommentRow, ...prev]);
      }
      setDraft('');
      showToast('Thanks — your feedback was posted.', 'success');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Could not send', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  function ProgramCard({
    program,
    variant,
  }: {
    program: TvProgramPublic;
    variant: 'upcoming' | 'past';
  }) {
    return (
      <button
        type="button"
        onClick={() => {
          triggerHapticFeedback(window);
          setActiveProgram(program);
        }}
        className={`w-full h-full rounded-2xl border text-left transition-all px-3 py-3 sm:px-4 sm:py-3.5 shadow-[0_8px_24px_rgba(0,0,0,0.18)] active:scale-[0.99] ${
          variant === 'upcoming'
            ? 'border-[#1e4a8a]/80 border-t-[3px] border-t-[#f3ba2f] bg-gradient-to-br from-[#123f78]/90 to-[#061428] hover:border-[#f3ba2f]/60 hover:shadow-[0_0_24px_rgba(243,186,47,0.12)]'
            : 'border-[#8bb4ef]/40 bg-gradient-to-br from-[#0f315f]/95 to-[#0a1628] hover:border-[#f3ba2f]/35'
        }`}
      >
        <p className="text-white font-bold text-[13px] sm:text-sm leading-snug line-clamp-2">{program.title}</p>
        {program.scheduledAt ? (
          <p className="text-blue-100/75 text-[10px] sm:text-xs mt-1.5 tabular-nums leading-tight">{formatWhen(program.scheduledAt)}</p>
        ) : null}
        {program.description ? (
          <p className="text-blue-100/60 text-[10px] sm:text-xs mt-1.5 line-clamp-2 leading-relaxed">{program.description}</p>
        ) : null}
        <p className="text-[#f3ba2f]/95 text-[10px] sm:text-[11px] mt-2 font-semibold tracking-wide">
          Watch · comment
        </p>
      </button>
    );
  }

  const activeList = listTab === 'upcoming' ? upcoming : past;
  const activeEmpty =
    listTab === 'upcoming'
      ? 'Nothing scheduled yet. New slots will show here when published.'
      : 'Past episodes appear here once each program has a valid YouTube link.';

  return (
    <div className="relative bg-[#0f3c86] min-h-screen pb-28">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-[#f3ba2f]/10 via-transparent to-transparent" />
      <UraStadiumPageHero
        title="URA TV"
        description="Official video programs — upcoming listings and replays on YouTube. Tap an episode to watch or comment."
        icon={navLearn}
      />

      <div className="relative w-full max-w-xl mx-auto px-4 pt-3 space-y-6">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              triggerHapticFeedback(window);
              setCurrentView('eearn');
            }}
            className="rounded-xl border border-[#8bb4ef]/45 bg-[#0f315f]/80 px-4 py-2.5 text-sm font-semibold text-blue-50 shadow-sm hover:bg-[#123f78]/90 hover:border-[#f3ba2f]/40 transition-colors"
          >
            ← Learn
          </button>
          <button
            type="button"
            onClick={() => void loadPrograms()}
            className="rounded-xl border border-[#f3ba2f]/55 bg-[#f3ba2f]/12 px-4 py-2.5 text-sm font-bold text-[#f3ba2f] hover:bg-[#f3ba2f]/20 transition-colors"
          >
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="h-9 w-9 rounded-full border-2 border-[#f3ba2f]/30 border-t-[#f3ba2f] animate-spin" aria-hidden />
            <p className="text-sm text-blue-100/75">Loading programs…</p>
          </div>
        ) : (
          <>
            <div className="flex flex-col items-center gap-3">
              <div
                role="tablist"
                aria-label="Program lists"
                className="inline-flex max-w-[min(100%,20rem)] rounded-full border border-[#8bb4ef]/45 bg-[#061428]/85 p-0.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={listTab === 'upcoming'}
                  id="ura-tv-tab-upcoming"
                  aria-controls="ura-tv-tab-panel"
                  onClick={() => {
                    triggerHapticFeedback(window);
                    setListTab('upcoming');
                  }}
                  className={`min-w-[6.5rem] sm:min-w-[7.25rem] rounded-full px-3 py-1.5 text-center text-[11px] sm:text-xs font-bold tracking-wide transition-all ${
                    listTab === 'upcoming'
                      ? 'bg-[#f3ba2f] text-[#0a1628] shadow-sm'
                      : 'text-blue-100/75 hover:text-white'
                  }`}
                >
                  Upcoming
                  {upcoming.length > 0 ? (
                    <span className={`ml-1 tabular-nums ${listTab === 'upcoming' ? 'opacity-80' : 'opacity-60'}`}>
                      ({upcoming.length})
                    </span>
                  ) : null}
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={listTab === 'library'}
                  id="ura-tv-tab-library"
                  aria-controls="ura-tv-tab-panel"
                  onClick={() => {
                    triggerHapticFeedback(window);
                    setListTab('library');
                  }}
                  className={`min-w-[6.5rem] sm:min-w-[7.25rem] rounded-full px-3 py-1.5 text-center text-[11px] sm:text-xs font-bold tracking-wide transition-all ${
                    listTab === 'library'
                      ? 'bg-[#f3ba2f] text-[#0a1628] shadow-sm'
                      : 'text-blue-100/75 hover:text-white'
                  }`}
                >
                  Library
                  {past.length > 0 ? (
                    <span className={`ml-1 tabular-nums ${listTab === 'library' ? 'opacity-80' : 'opacity-60'}`}>
                      ({past.length})
                    </span>
                  ) : null}
                </button>
              </div>
            </div>

            <section
              id="ura-tv-tab-panel"
              role="tabpanel"
              aria-labelledby={listTab === 'upcoming' ? 'ura-tv-tab-upcoming' : 'ura-tv-tab-library'}
              className="min-h-[8rem]"
            >
              {activeList.length === 0 ? (
                <p className="text-sm text-blue-100/70 rounded-2xl border border-dashed border-[#8bb4ef]/40 bg-[#0f315f]/40 px-4 py-7 text-center leading-relaxed max-w-md mx-auto">
                  {activeEmpty}
                </p>
              ) : (
                <div className="grid grid-cols-1 min-[380px]:grid-cols-2 gap-2.5 sm:gap-3">
                  {activeList.map((p) => (
                    <ProgramCard key={p.id} program={p} variant={listTab === 'upcoming' ? 'upcoming' : 'past'} />
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>

      {activeProgram ? (
        <div
          className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center p-3 bg-black/70 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="ura-tv-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setActiveProgram(null);
          }}
        >
          <div
            className="w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-2xl border border-[#1e4a8a]/90 border-t-[3px] border-t-[#f3ba2f] bg-gradient-to-b from-[#0f315f] to-[#061428] shadow-[0_24px_48px_rgba(0,0,0,0.45)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 flex justify-between items-start gap-2 px-4 py-3.5 border-b border-white/10 bg-[#0a1f3d]/95 backdrop-blur-md z-10">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#f3ba2f]">URA TV</p>
                <h3 id="ura-tv-modal-title" className="text-white font-bold text-lg leading-snug mt-1">
                  {activeProgram.title}
                </h3>
                {activeProgram.scheduledAt ? (
                  <p className="text-xs text-blue-100/75 mt-1 tabular-nums">{formatWhen(activeProgram.scheduledAt)}</p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => setActiveProgram(null)}
                className="shrink-0 rounded-xl border border-[#8bb4ef]/35 px-3 py-2 text-sm font-semibold text-blue-100 hover:bg-white/10 hover:border-[#f3ba2f]/40 transition-colors"
              >
                Close
              </button>
            </div>

            <div className="px-4 py-4 space-y-4">
              {activeProgram.description ? (
                <p className="text-sm text-blue-100/88 leading-relaxed">{activeProgram.description}</p>
              ) : null}

              {activeProgram.embedUrl ? (
                <div className="rounded-xl overflow-hidden border-2 border-[#f3ba2f]/35 bg-black aspect-video shadow-inner ring-1 ring-black/40">
                  <iframe
                    src={activeProgram.embedUrl}
                    title={activeProgram.title}
                    className="w-full h-full min-h-[200px]"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  />
                </div>
              ) : (
                <p className="text-sm text-amber-200/90 rounded-lg border border-amber-500/35 px-3 py-2">
                  Video URL needs to be a valid YouTube link (admin).
                </p>
              )}

              <div className="rounded-xl border border-[#8bb4ef]/35 border-l-[3px] border-l-[#f3ba2f] bg-[#061428]/90 p-3.5">
                <h4 className="text-sm font-bold text-white mb-2 tracking-tight">Comments & suggestions</h4>
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder={
                    userTelegramInitData
                      ? 'Share feedback or programme ideas…'
                      : 'Open from Telegram to comment.'
                  }
                  disabled={!userTelegramInitData || submitting}
                  rows={3}
                  className="w-full rounded-lg bg-[#131f33] border border-[#8bb4ef]/35 text-white text-sm px-3 py-2 placeholder:text-blue-100/35 outline-none focus:border-[#f3ba2f]/55 resize-none disabled:opacity-50"
                />
                <button
                  type="button"
                  disabled={!userTelegramInitData || submitting}
                  onClick={() => void submitSuggestion()}
                  className="mt-2 w-full rounded-xl bg-[#f3ba2f] text-[#0a1628] font-bold py-2.5 text-sm shadow-md shadow-black/20 hover:bg-[#f4c141] disabled:opacity-45 transition-colors"
                >
                  {submitting ? 'Posting…' : 'Post'}
                </button>
              </div>

              <div>
                <p className="text-xs font-semibold text-blue-100/70 uppercase tracking-wide mb-2">
                  Recent feedback
                </p>
                {commentsLoading ? (
                  <p className="text-xs text-blue-100/50">Loading…</p>
                ) : comments.length === 0 ? (
                  <p className="text-xs text-blue-100/45">No comments yet — start the conversation.</p>
                ) : (
                  <ul className="space-y-2">
                    {comments.map((c) => (
                      <li
                        key={c.id}
                        className="rounded-xl border border-[#8bb4ef]/25 bg-[#0c1526]/90 px-3 py-2.5 text-sm text-blue-50"
                      >
                        <span className="text-[11px] font-semibold text-[#f3ba2f]/90">
                          {c.authorName ?? 'Citizen'}
                        </span>
                        <span className="text-[10px] text-blue-100/45 ml-2">
                          {formatWhen(c.createdAt)}
                        </span>
                        <p className="text-blue-100/90 mt-1 whitespace-pre-wrap break-words">{c.body}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
