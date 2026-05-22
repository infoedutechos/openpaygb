'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import UraStadiumPageHero from '@/components/UraStadiumPageHero';
import { navServices } from '@/images';
import { triggerHapticFeedback } from '@/utils/ui';
import { useToast } from '@/contexts/ToastContext';

export type UraFcMatchPublic = {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeLogoUrl: string | null;
  awayLogoUrl: string | null;
  kickoffAt: string;
  venue: string | null;
  competition: string | null;
  status: string;
  homeScore: number | null;
  awayScore: number | null;
  highlightUrl: string | null;
};

interface UraFcPageProps {
  setCurrentView: (view: string) => void;
}

function openExternal(url: string) {
  triggerHapticFeedback(window);
  if (typeof window === 'undefined') return;
  const tg = (window as unknown as { Telegram?: { WebApp?: { openLink?: (u: string, o?: { try_instant_view?: boolean }) => void } } })
    .Telegram?.WebApp;
  if (tg?.openLink) {
    tg.openLink(url, { try_instant_view: false });
    return;
  }
  window.open(url, '_blank', 'noopener,noreferrer');
}

function formatKickoff(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export default function UraFcPage({ setCurrentView }: UraFcPageProps) {
  const showToast = useToast();
  const [tab, setTab] = useState<'upcoming' | 'results'>('upcoming');
  const [upcoming, setUpcoming] = useState<UraFcMatchPublic[]>([]);
  const [results, setResults] = useState<UraFcMatchPublic[]>([]);
  const [officialSiteUrl, setOfficialSiteUrl] = useState('https://urafc.co.ug/');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/ura-fc/matches');
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof data.error === 'string' ? data.error : 'Failed');
      setUpcoming(Array.isArray(data.upcoming) ? data.upcoming : []);
      setResults(Array.isArray(data.results) ? data.results : []);
      if (typeof data.officialSiteUrl === 'string' && data.officialSiteUrl.startsWith('http')) {
        setOfficialSiteUrl(data.officialSiteUrl);
      }
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Could not load fixtures', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const MatchCard = ({ m, tone }: { m: UraFcMatchPublic; tone: 'upcoming' | 'result' }) => {
    const isResult = tone === 'result';
    const score =
      isResult &&
      m.homeScore != null &&
      m.awayScore != null &&
      m.status === 'completed'
        ? `${m.homeScore} — ${m.awayScore}`
        : null;

    return (
      <article
        className={`rounded-2xl border overflow-hidden shadow-[0_12px_32px_rgba(0,0,0,0.2)] ${
          tone === 'upcoming'
            ? 'border-[#1e4a8a]/80 border-t-[3px] border-t-[#f3ba2f] bg-gradient-to-br from-[#123f78]/95 via-[#0f315f]/98 to-[#061428]'
            : 'border-[#8bb4ef]/35 bg-gradient-to-br from-[#0f315f]/95 to-[#0a1a32]'
        }`}
      >
        <div className="px-4 pt-3 pb-2 flex flex-wrap items-center justify-between gap-2 border-b border-white/10">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#f3ba2f]/90">
            {m.competition ?? 'Uganda Premier League'}
          </span>
          <span className="text-[11px] text-blue-100/65">{formatKickoff(m.kickoffAt)}</span>
        </div>
        <div className="px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-col items-center flex-1 min-w-0 gap-2">
              <div className="relative h-14 w-14 rounded-xl bg-white/95 border border-[#dbe9ff] overflow-hidden flex-shrink-0">
                {m.homeLogoUrl ? (
                  <Image src={m.homeLogoUrl} alt="" fill className="object-contain p-1" sizes="56px" unoptimized />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-xl font-black text-[#123f78]">
                    {m.homeTeam.slice(0, 2).toUpperCase()}
                  </span>
                )}
              </div>
              <p className="text-xs font-bold text-white text-center leading-snug line-clamp-2">{m.homeTeam}</p>
            </div>

            <div className="flex flex-col items-center px-2 shrink-0">
              {score ? (
                <p className="text-2xl font-black tabular-nums text-white tracking-tight">{score}</p>
              ) : (
                <p className="text-lg font-black tracking-wide text-[#f3ba2f] drop-shadow-sm">VS</p>
              )}
              <span className="text-[10px] uppercase tracking-wide text-blue-100/50 mt-1">
                {m.venue ?? 'Venue TBC'}
              </span>
            </div>

            <div className="flex flex-col items-center flex-1 min-w-0 gap-2">
              <div className="relative h-14 w-14 rounded-xl bg-white/95 border border-[#dbe9ff] overflow-hidden flex-shrink-0">
                {m.awayLogoUrl ? (
                  <Image src={m.awayLogoUrl} alt="" fill className="object-contain p-1" sizes="56px" unoptimized />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-xl font-black text-[#123f78]">
                    {m.awayTeam.slice(0, 2).toUpperCase()}
                  </span>
                )}
              </div>
              <p className="text-xs font-bold text-white text-center leading-snug line-clamp-2">{m.awayTeam}</p>
            </div>
          </div>

          {isResult && m.status === 'cancelled' ? (
            <p className="mt-3 text-center text-xs font-semibold text-rose-300/90">Cancelled</p>
          ) : null}

          {isResult && m.highlightUrl ? (
            <button
              type="button"
              onClick={() => openExternal(m.highlightUrl!)}
              className="mt-4 w-full rounded-xl border border-[#f3ba2f]/45 bg-[#f3ba2f]/15 py-2 text-sm font-bold text-[#f3ba2f] hover:bg-[#f3ba2f]/25"
            >
              Highlights · Watch
            </button>
          ) : null}
        </div>
      </article>
    );
  };

  const list = tab === 'upcoming' ? upcoming : results;

  return (
    <div className="bg-[#0f3c86] min-h-screen pb-28">
      <div className="relative">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-52 bg-gradient-to-b from-[#f3ba2f]/12 via-[#0f3c86]/40 to-transparent" />
        <UraStadiumPageHero
          title="URA FC"
          description="Uganda Revenue Authority FC — The Tax Collectors. Upcoming fixtures and recent results."
          icon={navServices}
        />
      </div>

      <div className="w-full max-w-xl mx-auto px-4 pt-2 space-y-5">
        <div className="rounded-2xl border border-[#8bb4ef]/40 border-t-[3px] border-t-[#f3ba2f] bg-[#f4f8ff] px-4 py-4 shadow-lg shadow-black/15">
          <p className="text-[#16427f] text-sm leading-relaxed">
            For tables, transfers, and club news visit{' '}
            <strong className="text-[#123f78]">urafc.co.ug</strong>. Only the fixtures listed here are edited for this app.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => openExternal(officialSiteUrl)}
              className="rounded-xl bg-[#123f78] text-white px-4 py-2.5 text-sm font-bold hover:bg-[#0f315f]"
            >
              Visit urafc.co.ug ↗
            </button>
            <button
              type="button"
              onClick={() => {
                triggerHapticFeedback(window);
                setCurrentView('eearn');
              }}
              className="rounded-xl border border-[#8bb4ef]/55 px-4 py-2.5 text-sm font-semibold text-[#123f78]"
            >
              ← Learn
            </button>
            <button
              type="button"
              onClick={() => void load()}
              className="rounded-xl border border-[#f3ba2f]/55 text-[#c9a227] px-4 py-2.5 text-sm font-semibold"
            >
              Refresh
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-[#8bb4ef]/40 border-t-[3px] border-t-[#f3ba2f] bg-[#0a1f3d]/90 p-1 grid grid-cols-2 gap-1 shadow-inner">
          {(
            [
              { key: 'upcoming' as const, label: 'Upcoming' },
              { key: 'results' as const, label: 'Results' },
            ] as const
          ).map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                triggerHapticFeedback(window);
                setTab(key);
              }}
              className={`py-3 rounded-lg text-sm font-bold transition-colors ${
                tab === key ? 'bg-[#f4f8ff] text-[#123f78]' : 'text-blue-100/85'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-center text-blue-100/70 py-16">Loading fixtures…</p>
        ) : list.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#8bb4ef]/45 bg-[#0f315f]/50 px-5 py-10 text-center">
            <p className="text-white font-semibold">No {tab === 'upcoming' ? 'upcoming' : 'completed'} fixtures yet</p>
            <p className="text-blue-100/65 text-sm mt-2 leading-relaxed">
              Administrators publish fixtures here so fans see them inside URAPearls. Live tables and club pages remain on{' '}
              <button type="button" className="underline text-[#f3ba2f]" onClick={() => openExternal(officialSiteUrl)}>
                urafc.co.ug
              </button>
              .
            </p>
          </div>
        ) : (
          <div className="space-y-4 pb-8">
            {list.map((m) => (
              <MatchCard key={m.id} m={m} tone={tab === 'upcoming' ? 'upcoming' : 'result'} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
