'use client';

import { useCallback, useEffect, useState } from 'react';
import { triggerHapticFeedback } from '@/utils/ui';
import { queueEarnBootstrap, type EarnBootstrapPayload } from '@/utils/earn-bootstrap';
import { useGameStore } from '@/utils/game-mechanics';
import { karibuDaysCompleted } from '@/utils/karibu-daily-ui';
import { navigateToKaribuDaily } from '@/utils/karibu-navigation';

export type EarnShortcutGridsProps = {
  setCurrentView: (view: string) => void;
  /** When the user is already on Earn, open popups / tab changes without remounting */
  applyEarnBootstrap?: (p: EarnBootstrapPayload) => void;
};

type ShortcutItem = { id: string; title: string; subtitle: string; onClick: () => void };

/** URA shell colours: navy surfaces (#0a1628–#172642), accent #5fa8ff, gold #f3ba2f (see globals.css). */
const PLAY_CARD_APPEARANCE: Record<string, { tone: string; icon: string }> = {
  tasks: { tone: 'from-[#172642] to-[#0a1628] border-[#5fa8ff]/45', icon: '✅' },
  decode: { tone: 'from-[#1f3f72] to-[#0e1a2e] border-[#5fa8ff]/42', icon: '🔐' },
  matrix: { tone: 'from-[#1a3058] to-[#0c1829] border-[#f3ba2f]/45', icon: '🎴' },
  'collection-cards': { tone: 'from-[#152a48] to-[#0a1628] border-[#5fa8ff]/38', icon: '🗂️' },
  'weekly-event': { tone: 'from-[#1e3460] to-[#0f1a2e] border-[#f3ba2f]/50', icon: '🎁' },
  'global-joinable-tasks': { tone: 'from-[#172642] to-[#050b14] border-[#2a4168]', icon: '🌍' },
  'ura-quiz': { tone: 'from-[#1f3f8f] to-[#101e32] border-[#f3ba2f]/55', icon: '📝' },
  'receipt-rush': { tone: 'from-[#1a3058] to-[#0a1628] border-[#5fa8ff]/48', icon: '🧾' },
  'true-false': { tone: 'from-[#162844] to-[#0a1424] border-[#f3ba2f]/42', icon: '⚖️' },
  'whistle-blower': { tone: 'from-[#121f35] to-[#0a1628] border-[#5fa8ff]/40', icon: '🛡️' },
  'voice-reports': { tone: 'from-[#1e3460] to-[#0d1829] border-[#5fa8ff]/44', icon: '🎤' },
  'words-of-the-day': { tone: 'from-[#1f3f72] to-[#0c1829] border-[#5fa8ff]/46', icon: '📖' },
  'earn-your-tenure': { tone: 'from-[#1a3058] to-[#0f1a2e] border-[#f3ba2f]/48', icon: '🎴' },
  leaderboard: { tone: 'from-[#172642] to-[#0a1628] border-[#2a4168]', icon: '🏆' },
  'karibu-daily': { tone: 'from-[#1e3460] to-[#0c1829] border-[#f3ba2f]/52', icon: '📅' },
  'mine-flow': { tone: 'from-[#152a48] to-[#0a1628] border-[#5fa8ff]/36', icon: '⛏️' },
  'pearls-collection': { tone: 'from-[#1a2850] to-[#0d1829] border-[#5fa8ff]/42', icon: '🧊' },
  'citizen-network': { tone: 'from-[#172642] to-[#050b14] border-[#5fa8ff]/40', icon: '👥' },
  'pearls-airdrop': { tone: 'from-[#1e3460] to-[#0f1a2e] border-[#f3ba2f]/46', icon: '🎈' },
  'mini-games': { tone: 'from-[#1f3f72] to-[#0e1a2e] border-[#f3ba2f]/40', icon: '🕹️' },
  'tax-trivia-live': { tone: 'from-[#1a3058] to-[#0c1829] border-[#f3ba2f]/44', icon: '🎤' },
  'spin-wheel': { tone: 'from-[#162844] to-[#0a1628] border-[#5fa8ff]/45', icon: '🎡' },
  /** Tile that opens the “more shortcuts” popup (same visual family as primary cards). */
  'earn-more': { tone: 'from-[#1f3f8f] to-[#0a1628] border-[#f3ba2f]/58', icon: '➕' },
  groupage: { tone: 'from-[#1a2844] to-[#0c1829] border-[#5fa8ff]/46', icon: '📦' },
  warehousing: { tone: 'from-[#1e3460] to-[#0a1628] border-[#f3ba2f]/44', icon: '🏭' },
  'service-experience': { tone: 'from-[#172640] to-[#0e1a2e] border-[#5eead4]/38', icon: '✨' },
};

/** Top of Earn tab: fixed shortcuts; everything else lives under “More”. */
const PRIMARY_SHORTCUT_IDS: string[] = [
  'ura-quiz',
  'receipt-rush',
  'true-false',
  'voice-reports',
  'earn-your-tenure',
  'words-of-the-day',
  'whistle-blower',
  'groupage',
  'warehousing',
  'service-experience',
];

const PRIMARY_ID_SET = new Set(PRIMARY_SHORTCUT_IDS);

/** Shared tagline for Earn your Tenure + Whistle blower shortcut tiles. */
const REWARD_AND_PROTECTION_SUBTITLE = 'Reward & protection';

function useKaribuEarnSubtitle() {
  const { userTelegramInitData } = useGameStore();
  const [subtitle, setSubtitle] = useState('10-day streak · 100–1000 white pearls');

  useEffect(() => {
    if (!userTelegramInitData) return;
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch(
          `/api/daily-reward?initData=${encodeURIComponent(userTelegramInitData)}`
        );
        if (!res.ok || cancelled) return;
        const s = await res.json();
        const c = karibuDaysCompleted(s);
        const line = s.claimedToday
          ? `Day ${c}/10 · Tap Arena unlocked today`
          : s.canClaimToday
            ? `Day ${c}/10 · Claim to unlock Tap Arena`
            : `Day ${c}/10 · Karibu Daily`;
        setSubtitle(line);
      } catch {
        /* keep default */
      }
    };
    void load();
    const onRefresh = () => {
      void load();
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('karibu-daily-status-changed', onRefresh);
    }
    return () => {
      cancelled = true;
      if (typeof window !== 'undefined') {
        window.removeEventListener('karibu-daily-status-changed', onRefresh);
      }
    };
  }, [userTelegramInitData]);

  return subtitle;
}

export default function EarnShortcutGrids({ setCurrentView, applyEarnBootstrap }: EarnShortcutGridsProps) {
  const [morePopupOpen, setMorePopupOpen] = useState(false);
  const karibuSubtitle = useKaribuEarnSubtitle();

  const goEarn = (payload: EarnBootstrapPayload) => {
    if (applyEarnBootstrap) {
      applyEarnBootstrap(payload);
      return;
    }
    queueEarnBootstrap(payload);
    setCurrentView('earn');
  };

  const highlights: ShortcutItem[] = [
    { id: 'ura-quiz', title: 'URA Quiz', subtitle: 'Quiz and earn PEARLS', onClick: () => goEarn({ openMitrolabsQuiz: true }) },
    { id: 'receipt-rush', title: 'Receipt Rush', subtitle: 'Upload receipt · +2000 blue on approval', onClick: () => goEarn({ openReceiptRush: true }) },
    {
      id: 'whistle-blower',
      title: 'Whistle blower',
      subtitle: REWARD_AND_PROTECTION_SUBTITLE,
      onClick: () => goEarn({ activeTabAll: true }),
    },
    {
      id: 'true-false',
      title: 'True or False – Uganda Tax Edition',
      subtitle: 'Tax knowledge challenge',
      onClick: () => goEarn({ activeTabAll: true }),
    },
    {
      id: 'voice-reports',
      title: 'Voice reports',
      subtitle: 'Approval-required blue pearls',
      onClick: () => goEarn({ activeTabAll: true }),
    },
    {
      id: 'words-of-the-day',
      title: 'Words of the Day',
      subtitle: 'Daily cipher · guess the word',
      onClick: () => goEarn({ openDailyCipher: true }),
    },
    {
      id: 'earn-your-tenure',
      title: 'Earn your Tenure',
      subtitle: REWARD_AND_PROTECTION_SUBTITLE,
      onClick: () => goEarn({ openDailyCombo: true }),
    },
    {
      id: 'groupage',
      title: 'Groupage',
      subtitle: 'Customs grouping & consolidated cargo',
      onClick: () => setCurrentView('services'),
    },
    {
      id: 'warehousing',
      title: 'Warehousing',
      subtitle: 'Bonded storage & warehouse services',
      onClick: () => setCurrentView('services'),
    },
    {
      id: 'service-experience',
      title: 'Service Experience',
      subtitle: 'Rate our agents or service',
      onClick: () => setCurrentView('services'),
    },
    { id: 'tasks', title: 'Tasks', subtitle: 'Open all earn activities', onClick: () => goEarn({ activeTabAll: true }) },
    { id: 'collection-cards', title: 'Collection Cards', subtitle: 'Open card collection progression', onClick: () => setCurrentView('collection') },
    { id: 'weekly-event', title: 'Weekly Event', subtitle: 'Complete weekly objectives', onClick: () => goEarn({ openWeeklyEvent: true }) },
    { id: 'global-joinable-tasks', title: 'Global Joinable Tasks', subtitle: 'Join league/team global competitions', onClick: () => goEarn({ openGlobalTasks: true }) },
    { id: 'leaderboard', title: 'Level & Leaderboard', subtitle: 'Track your ranking progress', onClick: () => setCurrentView('game') },
    {
      id: 'karibu-daily',
      title: 'Karibu Daily',
      subtitle: karibuSubtitle,
      onClick: () => navigateToKaribuDaily(setCurrentView, 'earn'),
    },
  ];

  const pearlClassic: ShortcutItem[] = [
    { id: 'mine-flow', title: 'Mine Flow', subtitle: 'Passive mining mode (rebranded from Mine)', onClick: () => setCurrentView('mine') },
    { id: 'pearls-collection', title: 'PEARLS Collection', subtitle: 'Card/progression collection', onClick: () => setCurrentView('collection') },
    { id: 'citizen-network', title: 'Citizen Network', subtitle: 'Referrals and social growth (from Friends)', onClick: () => setCurrentView('friends') },
    { id: 'pearls-airdrop', title: 'PEARLS Drops', subtitle: 'Drops and campaign rewards', onClick: () => setCurrentView('airdrop') },
  ];

  const moreGames: ShortcutItem[] = [
    { id: 'mini-games', title: 'Mini games', subtitle: 'Open mini games hub', onClick: () => goEarn({ openMiniGamesHub: true }) },
    { id: 'spin-wheel', title: 'Spin wheel', subtitle: 'Daily lucky spin', onClick: () => goEarn({ openLuckySpin: true }) },
    { id: 'tax-trivia-live', title: 'Tax Trivia Live Events', subtitle: 'Live learning events', onClick: () => goEarn({ openWeeklyEvent: true }) },
  ];

  const learningFun: ShortcutItem[] = [
    { id: 'social-engagement', title: 'Earn activities - social media engagement', subtitle: 'Complete social tasks', onClick: () => goEarn({ activeTabAll: true }) },
  ];

  const earnPlatform: ShortcutItem[] = [];

  const byId = new Map<string, ShortcutItem>();
  for (const item of highlights) {
    if (!byId.has(item.id)) byId.set(item.id, item);
  }
  for (const item of pearlClassic) {
    if (!byId.has(item.id)) byId.set(item.id, item);
  }

  const primaryItems: ShortcutItem[] = PRIMARY_SHORTCUT_IDS.map((id) => {
    const item = byId.get(id);
    if (!item) {
      throw new Error(`EarnShortcutGrids: missing primary shortcut "${id}"`);
    }
    return item;
  });

  const moreHighlights = highlights.filter((h) => !PRIMARY_ID_SET.has(h.id));
  const morePearlClassic = pearlClassic.filter((p) => !PRIMARY_ID_SET.has(p.id));
  const moreLearning = learningFun.filter(
    (l) => !PRIMARY_ID_SET.has(l.id) && !moreHighlights.some((h) => h.id === l.id)
  );

  const moreGamesFiltered = moreGames.filter(
    (g) => !PRIMARY_ID_SET.has(g.id) && !moreHighlights.some((h) => h.id === g.id)
  );

  const closeMorePopup = useCallback(() => setMorePopupOpen(false), []);

  const runShortcut = useCallback(
    (item: ShortcutItem, closeAfter: boolean) => {
      triggerHapticFeedback(window);
      if (closeAfter) setMorePopupOpen(false);
      item.onClick();
    },
    []
  );

  useEffect(() => {
    if (!morePopupOpen || typeof window === 'undefined') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMorePopup();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [morePopupOpen, closeMorePopup]);

  const renderHighlightButton = (item: ShortcutItem, opts?: { closePopupAfter?: boolean }) => {
    const closeAfter = opts?.closePopupAfter ?? false;
    const appearance = PLAY_CARD_APPEARANCE[item.id] ?? {
      tone: 'from-[#172642] to-[#0a1628] border-[#5fa8ff]/45',
      icon: '⭐',
    };
    return (
      <button
        key={item.id}
        type="button"
        onClick={() => runShortcut(item, closeAfter)}
        className={`rounded-2xl border bg-gradient-to-br ${appearance.tone} px-3 py-3 text-left transition-all hover:scale-[1.01]`}
      >
        <div className="flex items-start gap-2">
          <span className="mt-0.5 inline-flex h-10 min-w-10 items-center justify-center rounded-xl bg-[#0a1628]/90 border border-[#5fa8ff]/22 text-xl shadow-inner shadow-black/20">
            {appearance.icon}
          </span>
          <div className="min-w-0">
            <p className="text-base font-extrabold text-white leading-tight">{item.title}</p>
            <p className="text-xs text-[#b8d4ff]/90 mt-1 leading-snug">{item.subtitle}</p>
          </div>
        </div>
      </button>
    );
  };

  const renderHighlightGrid = (items: ShortcutItem[], opts?: { closePopupAfter?: boolean }) => (
    <div className="grid grid-cols-2 gap-3">
      {items.map((item) => renderHighlightButton(item, opts))}
    </div>
  );

  const renderListColumn = (items: ShortcutItem[], variant: 'learn' | 'earn', closePopupAfter?: boolean) => (
    <div className="space-y-2">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => runShortcut(item, Boolean(closePopupAfter))}
          className={`w-full rounded-xl border px-3 py-3 text-left transition-colors ${
            variant === 'learn'
              ? 'border-[var(--ura-yellow)]/55 bg-[var(--ura-yellow)]/10 hover:border-[var(--ura-yellow)]'
              : 'border-[#5fa8ff]/40 bg-[#0a1628]/85 hover:border-[#5fa8ff]/65 hover:bg-[#121f35]/90'
          }`}
        >
          <p className="text-sm font-bold text-white">{item.title}</p>
          <p className="text-xs text-gray-300 mt-1">{item.subtitle}</p>
        </button>
      ))}
    </div>
  );

  return (
    <div className="mt-2 space-y-6">
      <div>
        <h2 className="text-white text-lg font-bold tracking-tight">Pearls, games & activities</h2>
        <p className="text-gray-400 text-xs mt-1">Tap a shortcut below. Open More for Karibu, collections, mini games, and the rest.</p>
      </div>

      <section aria-labelledby="earn-primary-shortcuts-heading">
        <h3 id="earn-primary-shortcuts-heading" className="sr-only">
          Primary shortcuts
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {primaryItems.map((item) => renderHighlightButton(item))}
          {(() => {
            const appearance = PLAY_CARD_APPEARANCE['earn-more'];
            return (
              <button
                type="button"
                onClick={() => {
                  triggerHapticFeedback(window);
                  setMorePopupOpen(true);
                }}
                className={`rounded-2xl border bg-gradient-to-br ${appearance.tone} px-3 py-3 text-left transition-all hover:scale-[1.01]`}
              >
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 inline-flex h-10 min-w-10 items-center justify-center rounded-xl bg-[#0a1628]/90 border border-[#5fa8ff]/22 text-xl shadow-inner shadow-black/20">
                    {appearance.icon}
                  </span>
                  <div className="min-w-0">
                    <p className="text-base font-extrabold text-white leading-tight">More</p>
                    <p className="text-xs text-[#b8d4ff]/90 mt-1 leading-snug">Karibu, tasks, more games, leagues & more</p>
                  </div>
                </div>
              </button>
            );
          })()}
        </div>
      </section>

      {morePopupOpen ? (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-ura-navy/75 p-0 backdrop-blur-[1px] sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="earn-more-popup-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeMorePopup();
          }}
        >
          <div
            className="flex max-h-[90dvh] w-full max-w-md flex-col overflow-hidden rounded-t-2xl border border-ura-border/75 bg-[#13161d] shadow-xl sm:max-h-[85vh] sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-ura-border/85 shrink-0">
              <h3 id="earn-more-popup-title" className="text-lg font-bold text-white">
                More options
              </h3>
              <button
                type="button"
                onClick={() => {
                  triggerHapticFeedback(window);
                  closeMorePopup();
                }}
                className="rounded-lg px-3 py-1.5 text-sm font-semibold text-gray-400 hover:bg-white/5 hover:text-white"
              >
                Close
              </button>
            </div>
            <div className="overflow-y-auto px-3 py-4 space-y-6 no-scrollbar">
              {moreHighlights.length > 0 ? (
                <section aria-labelledby="earn-more-highlights-heading">
                  <h4 id="earn-more-highlights-heading" className="text-sm font-bold uppercase tracking-wide text-[#f3ba2f] mb-3">
                    Highlights
                  </h4>
                  {renderHighlightGrid(moreHighlights, { closePopupAfter: true })}
                </section>
              ) : null}
              {morePearlClassic.length > 0 ? (
                <section aria-labelledby="earn-more-pearl-heading">
                  <h4 id="earn-more-pearl-heading" className="text-sm font-bold uppercase tracking-wide text-emerald-300/95 mb-3">
                    Pearl Classic
                  </h4>
                  {renderHighlightGrid(morePearlClassic, { closePopupAfter: true })}
                </section>
              ) : null}
              {moreGamesFiltered.length > 0 ? (
                <section aria-labelledby="earn-more-games-heading">
                  <h4 id="earn-more-games-heading" className="text-sm font-bold uppercase tracking-wide text-violet-300/95 mb-3">
                    More games
                  </h4>
                  {renderHighlightGrid(moreGamesFiltered, { closePopupAfter: true })}
                </section>
              ) : null}
              {moreLearning.length > 0 ? (
                <section aria-labelledby="earn-more-learning-heading">
                  <h4 id="earn-more-learning-heading" className="text-sm font-bold uppercase tracking-wide text-amber-200/90 mb-3">
                    Learning & fun
                  </h4>
                  {renderListColumn(moreLearning, 'learn', true)}
                </section>
              ) : null}
              {earnPlatform.length > 0 ? (
                <section aria-labelledby="earn-more-platform-heading">
                  <h4 id="earn-more-platform-heading" className="text-sm font-bold uppercase tracking-wide text-cyan-200/90 mb-3">
                    On-platform earn
                  </h4>
                  {renderListColumn(earnPlatform, 'earn', true)}
                </section>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
