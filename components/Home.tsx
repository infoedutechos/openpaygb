'use client';

import { useEffect, useMemo, useState } from 'react';
import Image, { type StaticImageData } from 'next/image';
import { dailyCipher, dailyCombo, dailyReward, defaultProfileAvatar, pearlBlue, pearlGolden, pearlWhite, rankBlue, rankGold, rankSilver, rankWhite, uraFiscalFunHomeBanner, uraTreasuryCounter } from '@/images';
import { calculateLevelIndex, useGameStore } from '@/utils/game-mechanics';
import { LEVELS } from '@/utils/consts';
import { triggerHapticFeedback } from '@/utils/ui';
import { useToast } from '@/contexts/ToastContext';
import { PEARLS_BALANCE_REFRESH_EVENT } from '@/utils/pearl-balance-events';
import { applyPearlsMeClientPayload } from '@/utils/apply-pearls-me-client';
import { EcosystemRadialDashboard, type EcosystemBottomNavKey, type EcosystemDashboardModule } from '@/components/ecosystem';
import { queueEarnBootstrap, type EarnBootstrapPayload } from '@/utils/earn-bootstrap';
import { karibuDaysCompleted } from '@/utils/karibu-daily-ui';
import { navigateToKaribuDaily } from '@/utils/karibu-navigation';
import SupportChatWidget from '@/components/SupportChatWidget';
import NotificationCenter from '@/components/NotificationCenter';
import { PlayHubLaunchSwitcher } from '@/components/PlayHubLaunchSwitcher';

type ActionCenterTab = 'most-used' | 'favorites';

const HOME_ECOSYSTEM_ICONS: Record<string, string> = {
  tasks: '✅',
  decode: '🔐',
  matrix: '🎴',
  'collection-cards': '🗂️',
  'weekly-event': '🎁',
  'global-joinable-tasks': '🌍',
  'ura-quiz': '📝',
  'receipt-rush': '🧾',
  'true-false': '⚖️',
  leaderboard: '🏆',
  'karibu-daily': '📅',
  'mine-flow': '⛏️',
  'pearls-collection': '🧊',
  'citizen-network': '👥',
  'pearls-airdrop': '🎈',
  groupage: '📦',
  warehousing: '🏭',
  'service-experience': '✨',
  'ura-tv': '📺',
  'ura-fc': '⚽',
};

type ActionItem = {
  id: string;
  title: string;
  subtitle?: string;
  pearlType?: 'white' | 'blue';
  group?: 'play' | 'learn' | 'earn';
  icon?: StaticImageData;
  /** 'earn' | 'game' etc., or null for coming-soon toast */
  route?: string;
};

const ACTION_CATALOG: ActionItem[] = [
  { id: 'quiz', title: 'URA Quiz', subtitle: 'White pearls · no approval', pearlType: 'white', route: 'earn', group: 'play', icon: dailyCipher },
  { id: 'receipt', title: 'Receipt Rush', subtitle: 'Blue pearls · needs approval', pearlType: 'blue', route: 'earn', group: 'play', icon: dailyCombo },
  { id: 'leaderboard', title: 'Level & Leaderboard', subtitle: 'Track total pearl progress', route: 'game', group: 'play', icon: dailyCombo },
  { id: 'karibu', title: 'Karibu Daily', subtitle: 'White pearls · no approval', pearlType: 'white', route: 'earn', group: 'play', icon: dailyReward },
  { id: 'social-earn', title: 'Earn activities', subtitle: 'White pearls · no approval', pearlType: 'white', route: 'earn', group: 'learn', icon: dailyReward },
  { id: 'voice', title: 'Voice reports', subtitle: 'Blue pearls · needs approval', pearlType: 'blue', route: 'earn', group: 'earn', icon: dailyCombo },
  { id: 'whistle', title: 'Whistle blower', subtitle: 'Blue pearls · needs approval', pearlType: 'blue', route: 'earn', group: 'earn', icon: dailyCombo },
  { id: 'groupage', title: 'Groupage', subtitle: 'Customs grouping & consolidated cargo', route: 'services', group: 'earn', icon: dailyCipher },
  { id: 'warehousing', title: 'Warehousing', subtitle: 'Bonded storage & warehouse services', route: 'services', group: 'earn', icon: dailyCombo },
  { id: 'service-experience', title: 'Service Experience', subtitle: 'Rate our agents or service', route: 'services', group: 'earn', icon: dailyReward },
];

/** Full-width row under Action Center → Most used (same chrome as Earn shortcut cards). */
const HOME_MOST_USED_KARIBU: ActionItem = {
  id: 'karibu',
  title: 'Karibu Daily',
  subtitle: '10-day login · white pearls',
  pearlType: 'white',
  route: 'earn',
  group: 'play',
  icon: dailyReward,
};

/**
 * 2×2 grid: top row URA Quiz | Receipt Rush, bottom row Whistle blower | Voice reports (matches reference layout).
 */
const HOME_MOST_USED_GRID: ActionItem[] = [
  { id: 'quiz', title: 'URA Quiz', subtitle: 'Quiz and earn PEARLS', pearlType: 'white', route: 'earn', group: 'play', icon: dailyCipher },
  { id: 'receipt', title: 'Receipt Rush', subtitle: 'Receipt activity tracking', pearlType: 'blue', route: 'earn', group: 'play', icon: dailyCombo },
  { id: 'whistle', title: 'Whistle blower', subtitle: 'Protected reporting tasks', pearlType: 'blue', route: 'earn', group: 'earn', icon: dailyCombo },
  { id: 'voice', title: 'Voice reports', subtitle: 'Approval-required blue pearls', pearlType: 'blue', route: 'earn', group: 'earn', icon: dailyCombo },
];

/** Secondary main row — matches Earn shortcuts for Groupage · Warehousing · Service Experience */
const HOME_MAIN_SERVICE_BUTTONS: ActionItem[] = [
  { id: 'groupage', title: 'Groupage', subtitle: 'Customs grouping & consolidated cargo', route: 'services', group: 'earn', icon: dailyCipher },
  { id: 'warehousing', title: 'Warehousing', subtitle: 'Bonded storage & warehouse services', route: 'services', group: 'earn', icon: dailyCombo },
  { id: 'service-experience', title: 'Service Experience', subtitle: 'Rate our agents or service', route: 'services', group: 'earn', icon: dailyReward },
];

const HOME_MOST_USED_KARIBU_CHROME = { emoji: '📅', border: 'border-[#d9a63a]/55' } as const;

const HOME_MOST_USED_GRID_CHROME: Record<string, { emoji: string; border: string }> = {
  quiz: { emoji: '📝', border: 'border-[#d9a63a]/55' },
  receipt: { emoji: '🧾', border: 'border-[#6eb4ff]/50' },
  whistle: { emoji: '🛡️', border: 'border-[#5eead4]/45' },
  voice: { emoji: '🎤', border: 'border-[#a78bfa]/55' },
};

const HOME_MAIN_SERVICE_CHROME: Record<string, { emoji: string; border: string }> = {
  groupage: { emoji: '📦', border: 'border-[#6eb4ff]/48' },
  warehousing: { emoji: '🏭', border: 'border-[#d9a63a]/52' },
  'service-experience': { emoji: '✨', border: 'border-[#5eead4]/42' },
};

const HOME_MOST_USED_PINNED_IDS = new Set<string>([
  'karibu',
  ...HOME_MOST_USED_GRID.map((x) => x.id),
  ...HOME_MAIN_SERVICE_BUTTONS.map((x) => x.id),
]);

interface HomeProps {
  setCurrentView: (view: string) => void;
}

export default function Home({ setCurrentView }: HomeProps) {
  const showToast = useToast();
  const [activeActionTab, setActiveActionTab] = useState<ActionCenterTab>('most-used');
  const [showFavoritesManager, setShowFavoritesManager] = useState(false);
  const [favoritesSearch, setFavoritesSearch] = useState('');
  const [manualFavoriteTitle, setManualFavoriteTitle] = useState('');
  const [manualFavoriteSubtitle, setManualFavoriteSubtitle] = useState('');
  const [manualFavoriteRoute, setManualFavoriteRoute] = useState('');
  const [visitCounts, setVisitCounts] = useState<Record<string, number>>({});
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [customFavorites, setCustomFavorites] = useState<ActionItem[]>([]);
  const [showRanksPopup, setShowRanksPopup] = useState(false);
  const [showEcosystemDashboard, setShowEcosystemDashboard] = useState(false);
  const { userTelegramName, points, pointsBalance, bluePearlsTotal, userTelegramInitData, unsynchronizedPoints, lastServerConfirmedAt, lastServerFailedAt } =
    useGameStore();
  const [goldishPearls, setGoldishPearls] = useState(0);
  const [karibuHomeSubtitle, setKaribuHomeSubtitle] = useState('10-day login · 100–1000 white pearls');

  const storagePrefix = useMemo(() => {
    const fallback = 'anon';
    if (!userTelegramInitData) return fallback;
    try {
      const rawUser = new URLSearchParams(userTelegramInitData).get('user');
      if (!rawUser) return fallback;
      const parsed = JSON.parse(decodeURIComponent(rawUser)) as { id?: string | number };
      return String(parsed?.id ?? fallback);
    } catch {
      return fallback;
    }
  }, [userTelegramInitData]);
  const visitsStorageKey = `ura:home:visits:${storagePrefix}`;
  const favoritesStorageKey = `ura:home:favorites:${storagePrefix}`;
  const customFavoritesStorageKey = `ura:home:favorites:custom:${storagePrefix}`;

  const mostUsedItems = useMemo(() => {
    const scored = ACTION_CATALOG.map((item, index) => ({
      item,
      score: visitCounts[item.id] ?? 0,
      index,
    }))
      .filter((x) => x.score > 0)
      .sort((a, b) => (b.score - a.score) || (a.index - b.index));
    return scored.slice(0, 6).map((x) => x.item);
  }, [visitCounts]);

  const favoriteItems = useMemo(() => {
    const catalogById = new Map(ACTION_CATALOG.map((x) => [x.id, x]));
    const pickedCatalog = favoriteIds.map((id) => catalogById.get(id)).filter((x): x is ActionItem => Boolean(x));
    return [...pickedCatalog, ...customFavorites];
  }, [favoriteIds, customFavorites]);

  /** Most-used scores excluding pinned ids so Karibu / Quiz / etc. are not listed twice. */
  const mostUsedRest = useMemo(
    () => mostUsedItems.filter((item) => !HOME_MOST_USED_PINNED_IDS.has(item.id)),
    [mostUsedItems]
  );

  const availableFavoriteOptions = useMemo(() => {
    const q = favoritesSearch.trim().toLowerCase();
    return ACTION_CATALOG.filter((item) => !favoriteIds.includes(item.id))
      .filter((item) => !q || item.title.toLowerCase().includes(q) || (item.subtitle ?? '').toLowerCase().includes(q));
  }, [favoritesSearch, favoriteIds]);

  const levelIndex = useMemo(() => calculateLevelIndex(points), [points]);
  const pearlsDisplay = Math.floor(points).toLocaleString();
  const liveWhitePearls = Math.max(0, Math.floor(pointsBalance));
  const rankStep = Math.min(levelIndex + 1, LEVELS.length);
  const rankTotal = LEVELS.length;
  const ranks = useMemo(
    () => [
      { id: 0, color: 'White', name: 'Novice', tone: 'border-slate-300/40 bg-slate-100/5', image: rankWhite },
      { id: 1, color: 'Silver', name: 'Citizen', tone: 'border-gray-300/40 bg-gray-100/5', image: rankSilver },
      { id: 2, color: 'Blue', name: 'Patriot', tone: 'border-[#5fa8ff]/50 bg-[#5fa8ff]/10', image: rankBlue },
      { id: 3, color: 'Gold', name: 'Guardian', tone: 'border-[var(--ura-yellow)]/50 bg-[var(--ura-yellow)]/10', image: rankGold },
    ],
    []
  );
  const userRankIndex = useMemo(() => {
    if (rankTotal <= 1) return 0;
    const normalized = (rankStep - 1) / (rankTotal - 1);
    return Math.max(0, Math.min(3, Math.floor(normalized * 4)));
  }, [rankStep, rankTotal]);
  const rankTierName = ranks[userRankIndex].name;
  const rankStepDisplay = userRankIndex + 1;

  const syncIndicator = useMemo(() => {
    const lastOk = lastServerConfirmedAt ?? 0;
    const lastBad = lastServerFailedAt ?? 0;
    const serverUnreachable = lastBad > 0 && lastBad > lastOk;
    const serverOk = lastOk > 0 && lastOk >= lastBad;

    if (serverUnreachable) {
      return {
        dotClass: 'bg-red-500',
        animate: '',
        title: 'Cannot reach server or database. Check connection and try again.',
      };
    }
    if (unsynchronizedPoints >= 1) {
      return {
        dotClass: 'bg-amber-400',
        animate: 'animate-pulse',
        title: 'Taps are queued; syncing to the server in the background.',
      };
    }
    if (serverOk) {
      return {
        dotClass: 'bg-emerald-500',
        animate: 'animate-pulse',
        title: 'Server and database reachable; nothing queued to sync.',
      };
    }
    return {
      dotClass: 'bg-slate-400',
      animate: '',
      title: userTelegramInitData
        ? 'Checking connection…'
        : 'Open from Telegram to sync progress.',
    };
  }, [lastServerConfirmedAt, lastServerFailedAt, unsynchronizedPoints, userTelegramInitData]);

  useEffect(() => {
    const loadPearls = async () => {
      if (!userTelegramInitData) return;
      try {
        const res = await fetch('/api/pearls/me', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ initData: userTelegramInitData }),
        });
        if (res.ok || res.status < 500) {
          useGameStore.getState().recordServerConfirmed();
        } else {
          useGameStore.getState().recordServerFailed();
        }
        if (!res.ok) return;
        const data = await res.json();
        applyPearlsMeClientPayload(data, useGameStore.getState());
        setGoldishPearls(Math.floor(data?.balances?.goldish ?? 0));
      } catch {
        useGameStore.getState().recordServerFailed();
        // Keep UI responsive with zero fallback if pearls API is unavailable.
      }
    };
    loadPearls();
    const onRefresh = () => {
      void loadPearls();
    };
    window.addEventListener(PEARLS_BALANCE_REFRESH_EVENT, onRefresh);
    return () => window.removeEventListener(PEARLS_BALANCE_REFRESH_EVENT, onRefresh);
  }, [userTelegramInitData]);

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
          ? `Day ${c}/10 · claimed today`
          : s.canClaimToday
            ? `Day ${c}/10 · open to claim`
            : `Day ${c}/10 · Karibu Daily`;
        setKaribuHomeSubtitle(line);
      } catch {
        /* keep default */
      }
    };
    void load();
    const onKaribu = () => {
      void load();
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('karibu-daily-status-changed', onKaribu);
    }
    return () => {
      cancelled = true;
      if (typeof window !== 'undefined') {
        window.removeEventListener('karibu-daily-status-changed', onKaribu);
      }
    };
  }, [userTelegramInitData]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const parsedVisits = JSON.parse(window.localStorage.getItem(visitsStorageKey) ?? '{}') as Record<string, number>;
      setVisitCounts(parsedVisits);
      const parsedFavorites = JSON.parse(window.localStorage.getItem(favoritesStorageKey) ?? '[]') as string[];
      setFavoriteIds(Array.isArray(parsedFavorites) ? parsedFavorites : []);
      const parsedCustom = JSON.parse(window.localStorage.getItem(customFavoritesStorageKey) ?? '[]') as ActionItem[];
      setCustomFavorites(Array.isArray(parsedCustom) ? parsedCustom : []);
    } catch {
      setVisitCounts({});
      setFavoriteIds([]);
      setCustomFavorites([]);
    }
  }, [customFavoritesStorageKey, favoritesStorageKey, visitsStorageKey]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(visitsStorageKey, JSON.stringify(visitCounts));
  }, [visitCounts, visitsStorageKey]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(favoritesStorageKey, JSON.stringify(favoriteIds));
  }, [favoriteIds, favoritesStorageKey]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(customFavoritesStorageKey, JSON.stringify(customFavorites));
  }, [customFavorites, customFavoritesStorageKey]);

  const handleAction = (item: ActionItem) => {
    triggerHapticFeedback(window);
    setVisitCounts((prev) => ({ ...prev, [item.id]: (prev[item.id] ?? 0) + 1 }));
    if (item.route === 'services') {
      setCurrentView('services');
      return;
    }
    if (item.route === 'earn') {
      switch (item.id) {
        case 'karibu':
          navigateToKaribuDaily(setCurrentView, 'home');
          return;
        case 'quiz':
          queueEarnBootstrap({ openMitrolabsQuiz: true });
          setCurrentView('earn');
          return;
        case 'receipt':
          queueEarnBootstrap({ openReceiptRush: true });
          setCurrentView('earn');
          return;
        case 'voice':
        case 'whistle':
          queueEarnBootstrap({ activeTabAll: true });
          setCurrentView('earn');
          return;
        default:
          setCurrentView('earn');
          return;
      }
    }
    if (item.route) {
      setCurrentView(item.route);
      return;
    }
    showToast(`${item.title} has no destination configured. Edit this shortcut and choose a destination.`, 'error');
  };

  const renderActionCenterItem = (item: ActionItem, rowKey: string) => (
    <button
      key={rowKey}
      type="button"
      onClick={() => handleAction(item)}
      className="w-full rounded-xl border border-[#8bb4ef]/35 bg-[#f4f8ff] px-4 py-3 text-left hover:border-[#f3ba2f]/55 transition-colors"
    >
      <div className="flex items-start gap-3">
        <div className="h-9 w-9 rounded-lg border border-[#cfe0ff] bg-white flex items-center justify-center overflow-hidden flex-shrink-0">
          {item.icon ? (
            <Image src={item.icon} alt="" width={24} height={24} className="h-6 w-6 object-contain" />
          ) : (
            <span className="text-xs font-bold text-[#335f97]">{item.title.slice(0, 1).toUpperCase()}</span>
          )}
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-[#123f78] text-sm leading-snug">{item.title}</p>
          {item.subtitle ? <p className="text-xs text-[#335f97] mt-1">{item.subtitle}</p> : null}
        </div>
      </div>
      {item.group ? <p className="mt-1 text-[11px] text-[#5a7bb0] uppercase tracking-wide">{item.group}</p> : null}
      {item.pearlType ? (
        <p className="mt-1 text-[11px]">
          <span className={item.pearlType === 'white' ? 'text-[#335f97]' : 'text-[#2563c4]'}>
            {item.pearlType === 'white' ? 'White pearl activity' : 'Blue pearl activity'}
          </span>
        </p>
      ) : null}
    </button>
  );

  const renderMostUsedPinnedKaribu = () => {
    const { emoji, border } = HOME_MOST_USED_KARIBU_CHROME;
    return (
      <button
        type="button"
        onClick={() => handleAction(HOME_MOST_USED_KARIBU)}
        className={`w-full rounded-2xl border ${border} bg-[#f4f8ff] px-3 py-3.5 text-left transition-colors hover:bg-[#e8f0ff] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f3ba2f]/35`}
      >
        <div className="flex items-start gap-3">
          <span
            className="mt-0.5 inline-flex h-10 min-w-10 shrink-0 items-center justify-center rounded-xl border border-[#cfe0ff] bg-white text-xl"
            aria-hidden
          >
            {emoji}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-base font-extrabold leading-tight text-[#123f78]">{HOME_MOST_USED_KARIBU.title}</p>
            <p className="mt-1 text-sm leading-snug text-[#335f97]">{karibuHomeSubtitle}</p>
          </div>
        </div>
      </button>
    );
  };

  const renderMostUsedPinnedGrid = () => (
    <>
      <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-4">
        {HOME_MOST_USED_GRID.map((item) => {
          const chrome = HOME_MOST_USED_GRID_CHROME[item.id] ?? { emoji: '⭐', border: 'border-ura-border/85' };
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleAction(item)}
              className={`rounded-2xl border ${chrome.border} bg-[#f4f8ff] px-3 py-3 text-left transition-colors hover:bg-[#e8f0ff] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f3ba2f]/35`}
            >
              <div className="flex items-start gap-2">
                <span
                  className="mt-0.5 inline-flex h-9 min-w-9 shrink-0 items-center justify-center rounded-xl border border-[#cfe0ff] bg-white text-lg"
                  aria-hidden
                >
                  {chrome.emoji}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-extrabold leading-tight text-[#123f78]">{item.title}</p>
                  <p className="mt-1 text-[13px] leading-snug text-[#335f97]">{item.subtitle}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        {HOME_MAIN_SERVICE_BUTTONS.map((item) => {
          const chrome = HOME_MAIN_SERVICE_CHROME[item.id] ?? { emoji: '⭐', border: 'border-ura-border/85' };
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleAction(item)}
              className={`rounded-2xl border ${chrome.border} bg-[#f4f8ff] px-2 py-3 text-left transition-colors hover:bg-[#e8f0ff] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f3ba2f]/35`}
            >
              <div className="flex flex-col gap-1.5">
                <span
                  className="inline-flex h-8 min-w-8 items-center justify-center rounded-lg border border-[#cfe0ff] bg-white text-base shrink-0"
                  aria-hidden
                >
                  {chrome.emoji}
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] font-extrabold leading-snug text-[#123f78]">{item.title}</p>
                  <p className="mt-0.5 text-[10px] leading-snug text-[#335f97] line-clamp-2">{item.subtitle}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </>
  );

  const addCatalogFavorite = (id: string) => {
    setFavoriteIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  };

  const removeCatalogFavorite = (id: string) => {
    setFavoriteIds((prev) => prev.filter((x) => x !== id));
  };

  const addManualFavorite = () => {
    const title = manualFavoriteTitle.trim();
    if (!title) {
      showToast('Add a title for your favorite', 'error');
      return;
    }
    const route = manualFavoriteRoute.trim();
    const subtitle = manualFavoriteSubtitle.trim();
    const id = `manual:${Date.now()}`;
    setCustomFavorites((prev) => [...prev, { id, title, subtitle: subtitle || undefined, route: route || undefined }]);
    setManualFavoriteTitle('');
    setManualFavoriteSubtitle('');
    setManualFavoriteRoute('');
    showToast('Favorite added', 'success');
  };

  const homeEcosystemModules = useMemo((): EcosystemDashboardModule[] => {
    const goEarn = (payload: EarnBootstrapPayload) => {
      queueEarnBootstrap(payload);
      setShowEcosystemDashboard(false);
      setCurrentView('earn');
    };
    const goView = (view: string) => {
      setShowEcosystemDashboard(false);
      setCurrentView(view);
    };
    const ic = HOME_ECOSYSTEM_ICONS;
    return [
      { id: 'tasks', title: 'Tasks', subtitle: 'Open all earn activities', icon: ic.tasks, onClick: () => goEarn({activeTabAll: true }) },
      { id: 'decode', title: 'Decode', subtitle: 'Daily cipher challenge', icon: ic.decode, onClick: () => goEarn({openDailyCipher: true }) },
      { id: 'matrix', title: 'Matrix', subtitle: 'Daily combo challenge', icon: ic.matrix, onClick: () => goEarn({openDailyCombo: true }) },
      { id: 'collection-cards', title: 'Collection Cards', subtitle: 'Open card collection progression', icon: ic['collection-cards'], onClick: () => goView('collection') },
      { id: 'weekly-event', title: 'Weekly Event', subtitle: 'Complete weekly objectives', icon: ic['weekly-event'], onClick: () => goEarn({openWeeklyEvent: true }) },
      { id: 'global-joinable-tasks', title: 'Global Joinable Tasks', subtitle: 'Join league/team global competitions', icon: ic['global-joinable-tasks'], onClick: () => goEarn({openGlobalTasks: true }) },
      { id: 'ura-quiz', title: 'URA Quiz', subtitle: 'Quiz and earn PEARLS', icon: ic['ura-quiz'], onClick: () => goEarn({openMitrolabsQuiz: true }) },
      { id: 'receipt-rush', title: 'Receipt Rush', subtitle: 'Upload receipt · +2000 blue on approval', icon: ic['receipt-rush'], onClick: () => goEarn({openReceiptRush: true }) },
      {
        id: 'true-false',
        title: 'True or False – Uganda Tax Edition',
        subtitle: 'Tax knowledge challenge',
        icon: ic['true-false'],
        onClick: () => goEarn({activeTabAll: true }),
      },
      { id: 'leaderboard', title: 'Level & Leaderboard', subtitle: 'Track your ranking progress', icon: ic.leaderboard, onClick: () => goView('game') },
      {
        id: 'karibu-daily',
        title: 'Karibu Daily',
        subtitle: '10-day streak · Tap Arena after claim',
        icon: ic['karibu-daily'],
        onClick: () => {
          setShowEcosystemDashboard(false);
          navigateToKaribuDaily(setCurrentView, 'home');
        },
      },
      { id: 'mine-flow', title: 'Mine Flow', subtitle: 'Passive mining mode (rebranded from Mine)', icon: ic['mine-flow'], onClick: () => goView('mine') },
      { id: 'pearls-collection', title: 'PEARLS Collection', subtitle: 'Card/progression collection', icon: ic['pearls-collection'], onClick: () => goView('collection') },
      { id: 'citizen-network', title: 'Citizen Network', subtitle: 'Referrals and social growth (from Friends)', icon: ic['citizen-network'], onClick: () => goView('friends') },
      { id: 'pearls-airdrop', title: 'PEARLS Drops', subtitle: 'Drops and campaign rewards', icon: ic['pearls-airdrop'], onClick: () => goView('airdrop') },
      { id: 'groupage', title: 'Groupage', subtitle: 'Customs grouping & consolidated cargo', icon: ic.groupage, onClick: () => goView('services') },
      { id: 'warehousing', title: 'Warehousing', subtitle: 'Bonded storage & warehouse services', icon: ic.warehousing, onClick: () => goView('services') },
      {
        id: 'service-experience',
        title: 'Service Experience',
        subtitle: 'Rate our agents or service',
        icon: ic['service-experience'],
        onClick: () => goView('services'),
      },
      { id: 'ura-tv', title: 'URA TV', subtitle: 'Programs, schedule & live discussions', icon: ic['ura-tv'], onClick: () => goView('ura-tv') },
      { id: 'ura-fc', title: 'URA FC', subtitle: 'Fixtures, results & club updates', icon: ic['ura-fc'], onClick: () => goView('ura-fc') },
    ];
  }, [setCurrentView]);

  useEffect(() => {
    if (!showEcosystemDashboard || typeof document === 'undefined') return;
    const el = document.getElementById('home-ecosystem-panel');
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [showEcosystemDashboard]);

  return (
    <div className="bg-[#0f3c86] flex justify-center min-h-screen">
      {/* Side drawer-handle: opens ecosystem popup (matches edge tab + left chevron pattern) */}
      <button
        type="button"
        onClick={() => {
          triggerHapticFeedback(window);
          setShowEcosystemDashboard((open) => !open);
        }}
        aria-label={showEcosystemDashboard ? 'Hide URA Civilizational Ecosystem' : 'Open URA Civilizational Ecosystem'}
        aria-expanded={showEcosystemDashboard}
        className="fixed right-0 top-1/2 z-[45] flex min-h-[44px] min-w-[44px] -translate-y-1/2 items-center justify-center rounded-l-2xl border border-r-0 border-[#8bb4ef]/45 bg-[#0f315f]/95 py-4 pl-2 pr-1 shadow-[-6px_0_16px_rgba(15,49,95,0.45)] transition-colors hover:bg-[#123f78] active:bg-[#0f315f] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f3ba2f]/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f3c86] sm:py-6 sm:pl-2.5"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.75}
          className={`h-5 w-5 text-white transition-transform duration-200 ${showEcosystemDashboard ? 'rotate-180' : ''}`}
          aria-hidden
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 18l-6-6 6-6" />
        </svg>
      </button>

      <div className="w-full bg-[#0f3c86] text-white flex flex-col max-w-xl pb-24">
        <div className="px-4 pt-4">
          <div className="w-full rounded-2xl border border-[#8bb4ef]/35 bg-[#f4f8ff] p-3 flex items-center gap-3 hover:border-[#f3ba2f]/55 transition-colors">
            <button
              type="button"
              onClick={() => {
                triggerHapticFeedback(window);
                setCurrentView('settings');
              }}
              className="min-w-0 flex-1 flex items-center gap-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f3ba2f]/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[#f4f8ff] rounded-xl"
            >
              <div className="w-10 h-10 rounded-full border border-[#8bb4ef]/50 overflow-hidden bg-white flex-shrink-0 relative">
                <Image src={defaultProfileAvatar} alt="Profile" fill className="object-cover" sizes="40px" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-[#335f97]">URA Platform · Profile</p>
                <p className="font-semibold truncate text-[#123f78]">{userTelegramName || 'Citizen'}</p>
              </div>
            </button>
            <div className="shrink-0 flex items-center justify-center pl-1 pr-2 border-l border-[#8bb4ef]/40">
              <div className="rounded-full bg-[#e8eef9] border border-[#8bb4ef]/55 p-1 shadow-sm">
                <NotificationCenter />
              </div>
            </div>
            <div
              className="shrink-0 flex flex-col items-center justify-center px-2 py-1 border-l border-[#8bb4ef]/40 min-w-[4.5rem]"
              title={syncIndicator.title}
              role="status"
              aria-live="polite"
              aria-label={syncIndicator.title}
            >
              <p className="text-[10px] font-semibold text-[#5a7bb0] uppercase tracking-wide">Sync</p>
              <div className="flex items-center justify-center mt-1">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${syncIndicator.dotClass} ${syncIndicator.animate}`.trim()}
                  aria-hidden
                />
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-2xl overflow-hidden border border-[#8bb4ef]/35 bg-[#f5f0e8]">
            <Image
              src={uraFiscalFunHomeBanner}
              alt="Fiscal Fun — Uganda Revenue Authority"
              width={640}
              height={360}
              className="w-full h-auto object-cover"
              sizes="(max-width: 576px) 100vw, 576px"
              priority
            />
          </div>

          <div className="mt-3">
            <PlayHubLaunchSwitcher compact />
          </div>

          {showEcosystemDashboard ? (
            <div
              className="mt-4 rounded-xl border border-[#8bb4ef]/35 bg-[#f4f8ff] p-2 scroll-mt-4"
              id="home-ecosystem-panel"
              role="region"
              aria-label="URA Civilizational Ecosystem"
            >
              <div className="mb-1 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    triggerHapticFeedback(window);
                    setShowEcosystemDashboard(false);
                  }}
                  className="rounded-lg px-2 py-1 text-xs font-semibold text-[#335f97] transition-colors hover:bg-white/80 hover:text-[#123f78] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f3ba2f]/40"
                >
                  Close
                </button>
              </div>
              <EcosystemRadialDashboard
                modules={homeEcosystemModules}
                onHaptic={() => triggerHapticFeedback(window)}
                onBottomNav={(key: EcosystemBottomNavKey) => {
                  setShowEcosystemDashboard(false);
                  switch (key) {
                    case 'learn':
                      setCurrentView('eearn');
                      break;
                    case 'earn':
                      setCurrentView('earn');
                      break;
                    case 'engage':
                      queueEarnBootstrap({ activeTabAll: true });
                      setCurrentView('earn');
                      break;
                    case 'empower':
                      setCurrentView('airdrop');
                      break;
                    case 'elevate':
                      setCurrentView('game');
                      break;
                    default:
                      break;
                  }
                }}
              />
            </div>
          ) : null}

          <section className="mt-6" aria-label="Action Center">
            <h2 className="text-lg font-bold text-white tracking-tight mb-3">Action Center</h2>

            <div className="rounded-xl border border-[#8bb4ef]/35 bg-[#f4f8ff] p-3">
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-[#c9a227] tracking-tight">Total PEARLS</h3>
                <div className="mt-2 flex items-center gap-2">
                  <Image
                    src={uraTreasuryCounter}
                    alt=""
                    width={56}
                    height={56}
                    className="h-14 w-14 flex-shrink-0 object-contain"
                  />
                  <span className="text-2xl font-bold text-[#123f78] tabular-nums tracking-tight">{pearlsDisplay}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    triggerHapticFeedback(window);
                    setShowRanksPopup(true);
                  }}
                  aria-label={`Rank: ${rankTierName}, step ${rankStepDisplay} of 4. Tap for details.`}
                  className="mt-1.5 w-full text-left text-xs bg-transparent border-0 p-0 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f3ba2f]/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[#f4f8ff] rounded-sm transition-colors hover:opacity-95 active:opacity-85"
                >
                  <span className="text-[#c9a227] font-semibold underline-offset-2 decoration-[#f3ba2f]/50 hover:underline">{rankTierName}</span>
                  <span className="text-[#8aa3c4] mx-1">·</span>
                  <span className="text-[#16427f] font-medium tabular-nums">{rankStepDisplay}</span>
                  <span className="text-[#5a7bb0] tabular-nums"> / 4</span>
                  <span className="ml-1.5 text-[10px] font-normal text-[#5a7bb0]">Tap for details</span>
                </button>
                <div className="mt-4 space-y-2">
                  {[
                    { key: 'white', label: 'White pearl', value: liveWhitePearls, color: 'text-[#335f97]', hint: 'From taps & instant approved tasks', image: pearlWhite },
                    { key: 'blue', label: 'Blue pearl', value: bluePearlsTotal, color: 'text-[#2563c4]', hint: 'Pending + approved (includes wallet white→blue)', image: pearlBlue },
                    { key: 'goldish', label: 'Golden Pearl', value: goldishPearls, color: 'text-[#c9a227]', hint: 'Approved & withdraw-ready pearls', image: pearlGolden },
                  ].map((item) => (
                    <div key={item.key} className="rounded-lg border border-[#dbe9ff] bg-white px-2.5 py-2 flex items-center gap-2">
                      <Image src={item.image} alt={item.label} width={28} height={28} className="h-7 w-7 object-contain flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className={`text-xs font-semibold ${item.color}`}>{item.label}</p>
                        <p className="text-[10px] text-[#5a7bb0] truncate">{item.hint}</p>
                      </div>
                      <p className="text-sm font-bold text-[#123f78] tabular-nums">{item.value.toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-[#8bb4ef]/35 bg-[#0f315f]/90 p-1 grid grid-cols-2 gap-1">
              {(
                [
                  { key: 'most-used' as const, label: 'Most used' },
                  { key: 'favorites' as const, label: 'Favorites' },
                ] as const
              ).map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    triggerHapticFeedback(window);
                    setActiveActionTab(key);
                  }}
                  className={`py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                    activeActionTab === key ? 'bg-[#f4f8ff] text-[#123f78] border border-[#f3ba2f]/45' : 'text-blue-100/90'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {activeActionTab === 'favorites' ? (
              <div className="mt-3">
                <button
                  type="button"
                  onClick={() => {
                    triggerHapticFeedback(window);
                    setShowFavoritesManager(true);
                  }}
                  className="w-full rounded-lg border border-[#8bb4ef]/35 bg-white px-3 py-2 text-sm font-semibold text-[#123f78] hover:border-[#f3ba2f]/55 transition-colors"
                >
                  + Manage favorites
                </button>
              </div>
            ) : null}

            <div className="mt-4 space-y-2">
              {activeActionTab === 'most-used' ? (
                <>
                  <>
                    {renderMostUsedPinnedKaribu()}
                    {renderMostUsedPinnedGrid()}
                  </>
                  {mostUsedRest.length > 0 ? (
                    <>
                      <p className="mt-4 pt-1 text-[11px] font-semibold uppercase tracking-wide text-blue-100/80">Your most used</p>
                      <div className="space-y-2">{mostUsedRest.map((item) => renderActionCenterItem(item, item.id))}</div>
                    </>
                  ) : null}
                </>
              ) : (
                <>
                  {favoriteItems.map((item) => renderActionCenterItem(item, item.id))}
                  {favoriteItems.length === 0 ? (
                    <div className="w-full rounded-xl border border-dashed border-[#8bb4ef]/45 bg-[#f4f8ff] px-4 py-3 text-left">
                      <p className="font-semibold text-[#123f78] text-sm">No favorites yet</p>
                      <p className="text-xs text-[#335f97] mt-1">Open “Manage favorites” to add items by search or manual entry.</p>
                    </div>
                  ) : null}
                </>
              )}
            </div>
          </section>
        </div>
      </div>

      {showFavoritesManager && (
        <div className="fixed inset-0 z-50 bg-[#0f315f]/55 backdrop-blur-[1px] p-4 flex items-end sm:items-center justify-center">
          <div className="w-full max-w-md rounded-2xl border border-[#8bb4ef]/35 bg-[#f4f8ff] p-4 max-h-[85vh] overflow-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-[#123f78]">Manage favorites</h3>
              <button
                type="button"
                onClick={() => {
                  triggerHapticFeedback(window);
                  setShowFavoritesManager(false);
                }}
                className="text-sm text-[#335f97] hover:text-[#123f78]"
              >
                Close
              </button>
            </div>

            <div className="mt-3 space-y-2">
              <input
                value={favoritesSearch}
                onChange={(e) => setFavoritesSearch(e.target.value)}
                placeholder="Search activities to add"
                className="w-full rounded-lg border border-[#8bb4ef]/40 bg-white px-3 py-2 text-sm text-[#123f78] placeholder:text-[#5a7bb0] outline-none focus:border-[#f3ba2f]/70"
              />
              <div className="space-y-2">
                {availableFavoriteOptions.slice(0, 8).map((item) => (
                  <div key={item.id} className="rounded-lg border border-[#8bb4ef]/30 bg-white px-3 py-2 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#123f78] truncate">{item.title}</p>
                      {item.subtitle ? <p className="text-xs text-[#335f97] truncate">{item.subtitle}</p> : null}
                    </div>
                    <button
                      type="button"
                      onClick={() => addCatalogFavorite(item.id)}
                      className="text-xs rounded-md border border-[#8bb4ef]/45 px-2 py-1 text-[#16427f] hover:border-[#f3ba2f]/60"
                    >
                      Add
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 border-t border-[#dbe9ff] pt-3">
              <p className="text-sm font-semibold text-[#123f78]">Add manually</p>
              <div className="mt-2 space-y-2">
                <input
                  value={manualFavoriteTitle}
                  onChange={(e) => setManualFavoriteTitle(e.target.value)}
                  placeholder="Title"
                  className="w-full rounded-lg border border-[#8bb4ef]/40 bg-white px-3 py-2 text-sm text-[#123f78] placeholder:text-[#5a7bb0] outline-none focus:border-[#f3ba2f]/70"
                />
                <input
                  value={manualFavoriteSubtitle}
                  onChange={(e) => setManualFavoriteSubtitle(e.target.value)}
                  placeholder="Subtitle (optional)"
                  className="w-full rounded-lg border border-[#8bb4ef]/40 bg-white px-3 py-2 text-sm text-[#123f78] placeholder:text-[#5a7bb0] outline-none focus:border-[#f3ba2f]/70"
                />
                <input
                  value={manualFavoriteRoute}
                  onChange={(e) => setManualFavoriteRoute(e.target.value)}
                  placeholder="Route (e.g. earn, game) optional"
                  className="w-full rounded-lg border border-[#8bb4ef]/40 bg-white px-3 py-2 text-sm text-[#123f78] placeholder:text-[#5a7bb0] outline-none focus:border-[#f3ba2f]/70"
                />
                <button
                  type="button"
                  onClick={addManualFavorite}
                  className="w-full rounded-lg border border-[#8bb4ef]/35 bg-[#e8f1ff] px-3 py-2 text-sm font-semibold text-[#123f78] hover:border-[#f3ba2f]/55"
                >
                  Add manual favorite
                </button>
              </div>
            </div>

            <div className="mt-4 border-t border-[#dbe9ff] pt-3">
              <p className="text-sm font-semibold text-[#123f78]">Current favorites</p>
              <div className="mt-2 space-y-2">
                {favoriteIds.map((id) => {
                  const item = ACTION_CATALOG.find((x) => x.id === id);
                  if (!item) return null;
                  return (
                    <div key={item.id} className="rounded-lg border border-[#8bb4ef]/30 bg-white px-3 py-2 flex items-center justify-between gap-2">
                      <p className="text-sm text-[#123f78] truncate">{item.title}</p>
                      <button
                        type="button"
                        onClick={() => removeCatalogFavorite(item.id)}
                        className="text-xs rounded-md border border-[#8bb4ef]/45 px-2 py-1 text-[#16427f] hover:border-red-400"
                      >
                        Remove
                      </button>
                    </div>
                  );
                })}
                {customFavorites.map((item) => (
                  <div key={item.id} className="rounded-lg border border-[#8bb4ef]/30 bg-white px-3 py-2 flex items-center justify-between gap-2">
                    <p className="text-sm text-[#123f78] truncate">{item.title}</p>
                    <button
                      type="button"
                      onClick={() => setCustomFavorites((prev) => prev.filter((x) => x.id !== item.id))}
                      className="text-xs rounded-md border border-[#8bb4ef]/45 px-2 py-1 text-[#16427f] hover:border-red-400"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {showRanksPopup && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#0f315f]/55 p-0 backdrop-blur-[1px] sm:items-center sm:p-4">
          <div className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-[#8bb4ef]/35 bg-[#f4f8ff] p-4 sm:rounded-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-[#123f78]">Ranks</h3>
              <button
                type="button"
                onClick={() => {
                  triggerHapticFeedback(window);
                  setShowRanksPopup(false);
                }}
                className="text-sm text-[#335f97] hover:text-[#123f78]"
              >
                Close
              </button>
            </div>
            <p className="mt-1 text-xs text-[#335f97]">
              Current status: <span className="text-[#123f78] font-semibold">{ranks[userRankIndex].name}</span>
            </p>

            <div className="mt-3 space-y-2">
              {ranks.map((rank) => {
                const isCurrent = rank.id === userRankIndex;
                return (
                  <div
                    key={rank.id}
                    className={`rounded-xl border px-3 py-2 ${rank.tone} ${isCurrent ? 'ring-2 ring-[#f3ba2f]/70' : ''}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Image src={rank.image} alt={`${rank.color} rank`} width={28} height={28} className="h-7 w-7 rounded-md object-cover border border-[#8bb4ef]/40" />
                        <p className="text-sm font-semibold text-[#123f78] truncate">{rank.color} - {rank.name}</p>
                      </div>
                      <div className="flex-shrink-0">
                        {isCurrent ? (
                          <span className="text-[10px] font-bold rounded-full px-2 py-0.5 bg-[#f3ba2f] text-[#123f78]">CURRENT</span>
                        ) : (
                          <span className="text-[10px] text-[#5a7bb0]">Locked</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <SupportChatWidget placement="clicker" />
    </div>
  );
}
