// components/Earn.tsx

/**
 * This project was developed by Open Innovations Platforms and Technologies.
 *
 * Copyright (c) Open Innovations Platforms and Technologies. All rights reserved.
 * See utils/company-info.ts for official links and the license text returned by /api/license.
 */

'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Image from 'next/image';
import IceCube from '@/icons/IceCube';
import { useGameStore } from '@/utils/game-mechanics';
import { ACTIVITY_TAB_CATEGORIES } from '@/utils/consts';
import { capitalizeFirstLetter, formatNumber, triggerHapticFeedback } from '@/utils/ui';
import { getTaskImageSrc, earnRewardsIcon, pearlWhite } from '@/images';
import TaskPopup from './popups/TaskPopup';
import DailyCipherPopup from './popups/DailyCipherPopup';
import DailyComboPopup from './popups/DailyComboPopup';
import MiniGamesPopup from './popups/MiniGamesPopup';
import MiniGamesHubPopup from './popups/MiniGamesHubPopup';
import LuckySpinPopup from './popups/LuckySpinPopup';
import WeeklyEventPopup from './popups/WeeklyEventPopup';
import DonationPopup from './popups/DonationPopup';
import CreateLeaguePopup from './popups/CreateLeaguePopup';
import CreateTeamPopup from './popups/CreateTeamPopup';
import JoinTeamPopup from './popups/JoinTeamPopup';
import JoinLeaguePopup from './popups/JoinLeaguePopup';
import ChampionshipPopup from './popups/ChampionshipPopup';
import LeagueDetailPopup from './popups/LeagueDetailPopup';
import CurrentLeaguePopup from './popups/CurrentLeaguePopup';
import LeagueLevelsPopup from './popups/LeagueLevelsPopup';
import TeamLevelsPopup from './popups/TeamLevelsPopup';
import LeagueListPopup from './popups/LeagueListPopup';
import BrowseTeamsPopup from './popups/BrowseTeamsPopup';
import LeagueChallengesPopup from './popups/LeagueChallengesPopup';
import LeagueChallengeDetailPopup from './popups/LeagueChallengeDetailPopup';
import CreateLeagueChallengePopup from './popups/CreateLeagueChallengePopup';
import TeamChallengesPopup from './popups/TeamChallengesPopup';
import TeamChallengeDetailPopup from './popups/TeamChallengeDetailPopup';
import CreateTeamChallengePopup from './popups/CreateTeamChallengePopup';
import LeaguePointsTablePopup from './popups/LeaguePointsTablePopup';
import LeaguesGuidePopup from './popups/LeaguesGuidePopup';
import LeadershipDashboardPopup from './popups/LeadershipDashboardPopup';
import TeamMemberDashboardPopup from './popups/TeamMemberDashboardPopup';
import GlobalTasksPopup from './popups/GlobalTasksPopup';
import MitrolabsQuizPopup from './popups/MitrolabsQuizPopup';
import ReceiptRushPopup from './popups/ReceiptRushPopup';
import { Task, LeaguesData } from '@/utils/types';
import Wallet from './Wallet';
import { consumeEarnBootstrap, type EarnBootstrapPayload } from '@/utils/earn-bootstrap';
import { navigateToKaribuDaily } from '@/utils/karibu-navigation';
import EarnShortcutGrids from '@/components/EarnShortcutGrids';
import PublishedActivitiesFeed from '@/components/PublishedActivitiesFeed';

interface EarnProps {
  setCurrentView?: (view: string) => void;
  initialTab?: string;
  minimalOnly?: boolean;
}

const useFetchTasks = (userTelegramInitData: string) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const response = await fetch(`/api/tasks?initData=${encodeURIComponent(userTelegramInitData)}`);
        if (!response.ok) {
          throw new Error('Failed to fetch tasks');
        }
        const data = await response.json();
        setTasks(data.tasks);
      } catch (error) {
        console.error('Error fetching tasks:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTasks();
  }, [userTelegramInitData]);

  return { tasks, setTasks, isLoading };
};

export default function Earn({ setCurrentView, initialTab = 'All', minimalOnly = false }: EarnProps) {
  const { userTelegramInitData, pointsBalance, bluePearlsTotal } = useGameStore();
  const { tasks, setTasks, isLoading } = useFetchTasks(userTelegramInitData);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showDailyCipher, setShowDailyCipher] = useState(false);
  const [showDailyCombo, setShowDailyCombo] = useState(false);
  const [showMiniGames, setShowMiniGames] = useState(false);
  const [showMiniGamesHub, setShowMiniGamesHub] = useState(false);
  const [showLuckySpin, setShowLuckySpin] = useState(false);
  const [showWeeklyEvent, setShowWeeklyEvent] = useState(false);
  const [showDonation, setShowDonation] = useState(false);
  const [leaguesData, setLeaguesData] = useState<LeaguesData | null>(null);
  const [leaguesLoading, setLeaguesLoading] = useState(false);
  const [myTeams, setMyTeams] = useState<Array<{ id: string; name: string; isCreator: boolean }>>([]);
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [showJoinTeam, setShowJoinTeam] = useState(false);
  const [showCreateLeague, setShowCreateLeague] = useState(false);
  const [showJoinLeague, setShowJoinLeague] = useState(false);
  const [showChampionship, setShowChampionship] = useState(false);
  const [showLeagueDetailId, setShowLeagueDetailId] = useState<string | null>(null);
  const [joinLeagueInitialCode, setJoinLeagueInitialCode] = useState('');
  const [showLeaguesGuide, setShowLeaguesGuide] = useState(false);
  const [showLeagueLevels, setShowLeagueLevels] = useState(false);
  const [showBrowseLeagues, setShowBrowseLeagues] = useState(false);
  const [showBrowseTeams, setShowBrowseTeams] = useState(false);
  const [showTeamLevels, setShowTeamLevels] = useState(false);
  const [showLeagueChallenges, setShowLeagueChallenges] = useState(false);
  const [showLeagueChallengeDetailId, setShowLeagueChallengeDetailId] = useState<string | null>(null);
  const [showCreateLeagueChallenge, setShowCreateLeagueChallenge] = useState(false);
  const [showTeamChallenges, setShowTeamChallenges] = useState(false);
  const [showTeamChallengeDetailId, setShowTeamChallengeDetailId] = useState<string | null>(null);
  const [showCreateTeamChallenge, setShowCreateTeamChallenge] = useState(false);
  const [showLeaguePointsTable, setShowLeaguePointsTable] = useState(false);
  const [showLeadershipDashboard, setShowLeadershipDashboard] = useState(false);
  const [showTeamMemberDashboardId, setShowTeamMemberDashboardId] = useState<string | null>(null);
  const [showGlobalTasks, setShowGlobalTasks] = useState(false);
  const [showMitrolabsQuiz, setShowMitrolabsQuiz] = useState(false);
  const [showReceiptRush, setShowReceiptRush] = useState(false);
  const [activeTab, setActiveTab] = useState<string>(initialTab);
  const [earnMainTab, setEarnMainTab] = useState<'earn' | 'wallet'>('earn');

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    const p = consumeEarnBootstrap();
    if (!p) return;
    if (p.activeTabAll) setActiveTab('All');
    const open = () => {
      if (p.openDailyCipher) setShowDailyCipher(true);
      if (p.openDailyCombo) setShowDailyCombo(true);
      if (p.openWeeklyEvent) setShowWeeklyEvent(true);
      if (p.openGlobalTasks) setShowGlobalTasks(true);
      if (p.openMitrolabsQuiz) setShowMitrolabsQuiz(true);
      if (p.openReceiptRush) setShowReceiptRush(true);
      if (p.openDailyLogin && setCurrentView) navigateToKaribuDaily(setCurrentView, 'earn');
      if (p.openMiniGamesHub) setShowMiniGamesHub(true);
      if (p.openLuckySpin) setShowLuckySpin(true);
    };
    requestAnimationFrame(open);
  }, [setCurrentView]);

  const ownedTeams = useMemo(() => myTeams.filter((t) => t.isCreator), [myTeams]);
  const memberTeam = useMemo(() => myTeams.find((t) => !t.isCreator), [myTeams]);
  const ownedLeagues = useMemo(() => leaguesData?.customLeagues?.filter((cl) => cl.isCreator) ?? [], [leaguesData?.customLeagues]);
  const hasLeadership = ownedTeams.length > 0 || ownedLeagues.length > 0;

  const fetchLeagues = useCallback(async () => {
    if (!userTelegramInitData) return;
    setLeaguesLoading(true);
    try {
      const res = await fetch(`/api/leagues?initData=${encodeURIComponent(userTelegramInitData)}`);
      if (res.ok) {
        const data = await res.json();
        setLeaguesData(data);
      }
    } catch {
      setLeaguesData(null);
    } finally {
      setLeaguesLoading(false);
    }
  }, [userTelegramInitData]);

  const fetchTeams = useCallback(async () => {
    if (!userTelegramInitData) return;
    try {
      const res = await fetch(`/api/teams?initData=${encodeURIComponent(userTelegramInitData)}`);
      if (res.ok) {
        const data = await res.json();
        setMyTeams((data.teams ?? []).map((t: { id: string; name: string; isCreator: boolean }) => ({ id: t.id, name: t.name, isCreator: t.isCreator })));
      } else {
        setMyTeams([]);
      }
    } catch {
      setMyTeams([]);
    }
  }, [userTelegramInitData]);

  useEffect(() => {
    if (activeTab === 'Leagues') {
      fetchLeagues();
      fetchTeams();
    }
  }, [activeTab, fetchLeagues, fetchTeams]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const code = params.get('league');
    if (code && activeTab === 'Leagues') {
      setJoinLeagueInitialCode(code);
      setShowJoinLeague(true);
    }
  }, [activeTab]);

  const openTaskPopup = useCallback((task: Task) => {
    triggerHapticFeedback(window);
    setSelectedTask(task);
  }, []);

  const handleTaskUpdate = useCallback((updatedTask: Task) => {
    setTasks(prevTasks =>
      prevTasks.map(t =>
        t.id === updatedTask.id ? updatedTask : t
      )
    );
  }, [setTasks]);

  const taskPopupEl =
    selectedTask != null ? (
      <TaskPopup
        key={selectedTask.id}
        task={selectedTask}
        onClose={() => setSelectedTask(null)}
        onUpdate={handleTaskUpdate}
      />
    ) : null;

  const displayTasks = useMemo(() => {
    const list =
      activeTab === 'All'
        ? tasks.filter((t) => t.type !== 'REFERRAL')
        : tasks.filter((t) => t.category === activeTab);
    return [...list].sort((a, b) => (a.isCompleted === b.isCompleted ? 0 : a.isCompleted ? 1 : -1));
  }, [activeTab, tasks]);

  const tabHasPending = useMemo(() => {
    const allTasksExcludingReferrals = tasks.filter((t) => t.type !== 'REFERRAL');
    const out: Record<string, boolean> = { All: allTasksExcludingReferrals.some((t) => !t.isCompleted) };
    ACTIVITY_TAB_CATEGORIES.forEach((cat) => {
      out[cat] = tasks.filter((t) => t.category === cat).some((t) => !t.isCompleted);
    });
    return out;
  }, [tasks]);

  const tabLabels = useMemo(() => ['All', ...ACTIVITY_TAB_CATEGORIES], []);

  const applyEarnBootstrap = useCallback((p: EarnBootstrapPayload) => {
    if (p.activeTabAll) setActiveTab('All');
    requestAnimationFrame(() => {
      if (p.openDailyCipher) setShowDailyCipher(true);
      if (p.openDailyCombo) setShowDailyCombo(true);
      if (p.openWeeklyEvent) setShowWeeklyEvent(true);
      if (p.openGlobalTasks) setShowGlobalTasks(true);
      if (p.openMitrolabsQuiz) setShowMitrolabsQuiz(true);
      if (p.openReceiptRush) setShowReceiptRush(true);
      if (p.openDailyLogin && setCurrentView) navigateToKaribuDaily(setCurrentView, 'earn');
      if (p.openMiniGamesHub) setShowMiniGamesHub(true);
      if (p.openLuckySpin) setShowLuckySpin(true);
    });
  }, [setCurrentView]);

  if (minimalOnly) {
    return (
      <div className="bg-ura-page flex justify-center min-h-screen">
        <div className="w-full bg-ura-page text-white font-bold flex flex-col max-w-xl">
          <div className="flex-grow mt-4 bg-ura-gold rounded-t-[48px] relative top-glow z-0">
            <div className="mt-[2px] bg-ura-panel rounded-t-[46px] h-full overflow-y-auto no-scrollbar">
              <div className="px-4 pt-6 pb-24">
                <div className="flex justify-center mb-4">
                  <Image
                    src={earnRewardsIcon}
                    alt="Earn rewards and tasks"
                    width={96}
                    height={96}
                    className="object-contain drop-shadow-md"
                    priority
                  />
                </div>
                <div className="mb-4 rounded-xl border border-ura-border/85 bg-[#161923] p-1 grid grid-cols-2 gap-1">
                  {[
                    { key: 'earn' as const, label: 'Earn' },
                    { key: 'wallet' as const, label: 'Wallet' },
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => {
                        triggerHapticFeedback(window);
                        setEarnMainTab(tab.key);
                      }}
                      className={`py-2 rounded-lg text-sm font-semibold transition-colors ${
                        earnMainTab === tab.key ? 'bg-[var(--ura-blue-dark)] text-white' : 'text-gray-400'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {earnMainTab === 'wallet' ? (
                  <Wallet setCurrentView={setCurrentView ?? (() => {})} embedded />
                ) : (
                  <>
                    <EarnShortcutGrids
                      setCurrentView={setCurrentView ?? (() => {})}
                      applyEarnBootstrap={applyEarnBootstrap}
                    />
                    <section aria-label="Activities">
                      <PublishedActivitiesFeed
                        initData={userTelegramInitData}
                        tasks={tasks}
                        onOpenTask={openTaskPopup}
                      />
                    </section>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
        {taskPopupEl}
        {showMitrolabsQuiz && (
          <MitrolabsQuizPopup onClose={() => setShowMitrolabsQuiz(false)} />
        )}
        {showReceiptRush && (
          <ReceiptRushPopup onClose={() => setShowReceiptRush(false)} />
        )}
      </div>
    );
  }

  return (
    <div className="bg-ura-page flex justify-center min-h-screen">
      <div className="w-full bg-ura-page text-white font-bold flex flex-col max-w-xl">
        <div className="flex-grow mt-4 bg-ura-gold rounded-t-[48px] relative top-glow z-0">
          <div className="mt-[2px] bg-ura-panel rounded-t-[46px] h-full overflow-y-auto no-scrollbar">
            <div className="px-4 pt-1 pb-24">
              <div className="relative mt-4">
                <div className="flex justify-center mb-4">
                  <Image
                    src={earnRewardsIcon}
                    alt="Earn rewards and tasks"
                    width={96}
                    height={96}
                    className="object-contain mx-auto drop-shadow-md"
                    priority
                  />
                </div>
                <h1 className="text-2xl text-center mb-2">Earn More PEARLS</h1>
                <p className="text-center text-[#f3ba2f] font-bold mb-1">
                  Balance: {formatNumber(Math.floor(pointsBalance))} white PEARLS
                </p>
                <p className="text-center text-gray-400 text-sm font-medium mb-4">
                  Blue PEARLS (pending + approved): {formatNumber(Math.floor(bluePearlsTotal))}
                </p>
                {/* Activities section – tabbed list (scroll down to see) */}
                <section
                  id="earn-activities"
                  className="mt-10 pt-6 border-t border-ura-border/85"
                  aria-label="Activities"
                >
                  <h2 className="text-xl font-bold text-white mb-4">Activities</h2>
                  {isLoading ? (
                    <div className="text-center text-gray-400 py-10">Loading activities...</div>
                  ) : (
                    <>
                      <div className="flex gap-1 p-1 rounded-xl bg-ura-panel-2 border border-ura-border/85 mb-4">
                        {tabLabels.map((tab) => (
                          <button
                            key={tab}
                            type="button"
                            onClick={() => {
                              triggerHapticFeedback(window);
                              setActiveTab(tab);
                            }}
                            className={`relative flex-1 min-w-0 py-2.5 px-3 rounded-lg text-sm font-semibold transition-all duration-200 ${
                              activeTab === tab
                                ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-500/20'
                                : 'text-gray-400 hover:text-white hover:bg-ura-panel-2'
                            }`}
                          >
                            {capitalizeFirstLetter(tab)}
                            {tabHasPending[tab] && (
                              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-[#1a1c22]" aria-hidden />
                            )}
                          </button>
                        ))}
                      </div>
                      <div className="space-y-3">
                        {activeTab === 'Leagues' ? (
                          <>
                            {leaguesLoading ? (
                              <div className="text-center text-gray-400 py-10">Loading leagues…</div>
                            ) : (
                              <div className="space-y-8">
                                {/* Grid 1: Your status */}
                                <section>
                                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Your status</h3>
                                  <div className="grid grid-cols-2 gap-3">
                                    <button
                                      type="button"
                                      onClick={() => { triggerHapticFeedback(window); if (leaguesData) setShowLeagueDetailId('current'); }}
                                      className="col-span-2 flex items-center gap-3 p-4 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/10 border border-amber-500/30 text-left"
                                    >
                                      <span className="text-3xl">🏆</span>
                                      <div className="min-w-0 flex-1">
                                        <p className="font-bold text-white">Current league</p>
                                        <p className="text-sm text-amber-200/90">{leaguesData?.currentTier ?? 'Bronze'} · {leaguesData?.weeklyPoints ?? 0} LP this week{(leaguesData?.weeklyTeamPoints ?? 0) > 0 ? ` · ${leaguesData?.weeklyTeamPoints ?? 0} TP` : ''}</p>
                                        {leaguesData?.rankInTier != null && (
                                          <p className="text-xs text-gray-400">Rank #{leaguesData.rankInTier} in tier</p>
                                        )}
                                      </div>
                                      <span className="text-gray-400">→</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => { triggerHapticFeedback(window); setShowChampionship(true); }}
                                      className="col-span-2 flex items-center gap-3 p-4 rounded-xl bg-gradient-to-br from-rose-500/20 to-pink-500/10 border border-rose-500/30 text-left"
                                    >
                                      <span className="text-3xl">🔥</span>
                                      <div className="min-w-0 flex-1">
                                        <p className="font-bold text-white">URAPearls Championship</p>
                                        <p className="text-sm text-rose-200/90">Top 100 Diamond & Legend · Every 8 weeks</p>
                                      </div>
                                      <span className="text-gray-400">→</span>
                                    </button>
                                  </div>
                                </section>

                                {/* Grid 2: Learn & levels */}
                                <section>
                                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Learn & levels</h3>
                                  <div className="grid grid-cols-2 gap-3">
                                    <button
                                      type="button"
                                      onClick={() => { triggerHapticFeedback(window); setShowLeagueLevels(true); }}
                                      className="flex items-center gap-3 p-4 rounded-xl bg-[#252836] border border-ura-border/75 text-left hover:border-amber-500/40 transition-colors"
                                    >
                                      <span className="text-2xl">📊</span>
                                      <div className="min-w-0">
                                        <p className="font-bold text-white">League levels</p>
                                        <p className="text-xs text-gray-400">Bronze to Legend</p>
                                      </div>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => { triggerHapticFeedback(window); setShowTeamLevels(true); }}
                                      className="flex items-center gap-3 p-4 rounded-xl bg-[#252836] border border-ura-border/75 text-left hover:border-sky-500/40 transition-colors"
                                    >
                                      <span className="text-2xl">👥</span>
                                      <div className="min-w-0">
                                        <p className="font-bold text-white">Team levels</p>
                                        <p className="text-xs text-gray-400">How teams work</p>
                                      </div>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => { triggerHapticFeedback(window); setShowLeaguePointsTable(true); }}
                                      className="flex items-center gap-3 p-4 rounded-xl bg-[#252836] border border-ura-border/75 text-left hover:border-[#f3ba2f]/40 transition-colors"
                                    >
                                      <span className="text-2xl">📈</span>
                                      <div className="min-w-0">
                                        <p className="font-bold text-white">How to earn LP</p>
                                        <p className="text-xs text-gray-400">Activity table</p>
                                      </div>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => { triggerHapticFeedback(window); setShowLeaguesGuide(true); }}
                                      className="flex items-center gap-3 p-4 rounded-xl bg-[#252836] border border-ura-border/75 text-left hover:border-[#f3ba2f]/40 transition-colors"
                                    >
                                      <span className="text-2xl">📖</span>
                                      <div className="min-w-0">
                                        <p className="font-bold text-white">User guide</p>
                                        <p className="text-xs text-gray-400">Tiers, LP, leagues</p>
                                      </div>
                                    </button>
                                  </div>
                                </section>

                                {/* Grid 3: Teams */}
                                <section>
                                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Teams</h3>
                                  <div className="grid grid-cols-2 gap-3">
                                    <button
                                      type="button"
                                      onClick={() => { triggerHapticFeedback(window); setShowCreateTeam(true); }}
                                      className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-br from-sky-500/20 to-indigo-500/10 border border-sky-500/30 text-left"
                                    >
                                      <span className="text-2xl">👥</span>
                                      <div className="min-w-0">
                                        <p className="font-bold text-white">Create team</p>
                                        <p className="text-xs text-sky-200/90">1M PEARLS · Required for leagues</p>
                                      </div>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => { triggerHapticFeedback(window); setShowJoinTeam(true); }}
                                      className="flex items-center gap-3 p-4 rounded-xl bg-[#252836] border border-sky-500/30 text-left hover:border-sky-500/50"
                                    >
                                      <span className="text-2xl">🔗</span>
                                      <div className="min-w-0">
                                        <p className="font-bold text-white">Join team</p>
                                        <p className="text-xs text-gray-400">Invite code · No fee</p>
                                      </div>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => { triggerHapticFeedback(window); setShowBrowseTeams(true); }}
                                      className="col-span-2 flex items-center gap-3 p-4 rounded-xl bg-[#252836] border border-ura-border/75 text-left hover:border-sky-500/40 transition-colors"
                                    >
                                      <span className="text-2xl">📋</span>
                                      <div className="min-w-0 flex-1">
                                        <p className="font-bold text-white">Browse teams</p>
                                        <p className="text-sm text-gray-400">List · Request to join or get invite code</p>
                                      </div>
                                      <span className="text-gray-400">→</span>
                                    </button>
                                    {memberTeam && (
                                      <button
                                        type="button"
                                        onClick={() => { triggerHapticFeedback(window); setShowTeamMemberDashboardId(memberTeam.id); }}
                                        className="col-span-2 flex items-center gap-3 p-4 rounded-xl bg-gradient-to-br from-sky-500/20 to-indigo-500/10 border border-sky-500/30 text-left"
                                      >
                                        <span className="text-2xl">📊</span>
                                        <div className="min-w-0 flex-1">
                                          <p className="font-bold text-white">Team dashboard</p>
                                          <p className="text-sm text-sky-200/90">{memberTeam.name} · Announcements, TP/LP, tasks</p>
                                        </div>
                                        <span className="text-gray-400">→</span>
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => { triggerHapticFeedback(window); setShowTeamChallenges(true); }}
                                      className="col-span-2 flex items-center gap-3 p-4 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/10 border border-cyan-500/30 text-left"
                                    >
                                      <span className="text-2xl">👥</span>
                                      <div className="min-w-0 flex-1">
                                        <p className="font-bold text-white">Team vs Team</p>
                                        <p className="text-sm text-cyan-200/90">Challenge another team · First to target PEARLS wins prize</p>
                                      </div>
                                      <span className="text-gray-400">→</span>
                                    </button>
                                  </div>
                                </section>

                                {/* Grid 4: Leagues */}
                                <section>
                                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Leagues</h3>
                                  <div className="grid grid-cols-2 gap-3">
                                    <button
                                      type="button"
                                      onClick={() => { triggerHapticFeedback(window); setShowCreateLeague(true); }}
                                      className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/30 text-left"
                                    >
                                      <span className="text-2xl">➕</span>
                                      <div className="min-w-0">
                                        <p className="font-bold text-white">Create league</p>
                                        <p className="text-xs text-emerald-200/90">10M PEARLS · Need a team</p>
                                      </div>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => { triggerHapticFeedback(window); setJoinLeagueInitialCode(''); setShowJoinLeague(true); }}
                                      className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-br from-violet-500/20 to-indigo-500/10 border border-violet-500/30 text-left"
                                    >
                                      <span className="text-2xl">🔗</span>
                                      <div className="min-w-0">
                                        <p className="font-bold text-white">Join league</p>
                                        <p className="text-xs text-violet-200/90">Enter invite code</p>
                                      </div>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => { triggerHapticFeedback(window); setShowBrowseLeagues(true); }}
                                      className="col-span-2 flex items-center gap-3 p-4 rounded-xl bg-[#252836] border border-ura-border/75 text-left hover:border-violet-500/40 transition-colors"
                                    >
                                      <span className="text-2xl">📋</span>
                                      <div className="min-w-0 flex-1">
                                        <p className="font-bold text-white">Browse leagues</p>
                                        <p className="text-sm text-gray-400">List, performance, members · Request to join</p>
                                      </div>
                                      <span className="text-gray-400">→</span>
                                    </button>
                                    {leaguesData?.customLeagues && leaguesData.customLeagues.length > 0 && (
                                      <>
                                        <p className="col-span-2 text-xs font-medium text-gray-500 mt-1">My leagues</p>
                                        {leaguesData.customLeagues.map((cl) => (
                                          <button
                                            key={cl.id}
                                            type="button"
                                            onClick={() => { triggerHapticFeedback(window); setShowLeagueDetailId(cl.id); }}
                                            className="col-span-2 flex items-center justify-between p-3 rounded-xl bg-[#252836] border border-ura-border/85 text-left hover:border-violet-500/40"
                                          >
                                            <div>
                                              <p className="font-medium text-white">{cl.name}</p>
                                              <p className="text-xs text-gray-400">{cl.memberCount} members{cl.myRank != null ? ` · Rank #${cl.myRank}` : ''}{cl.myPoints != null ? ` · ${cl.myPoints} LP` : ''}</p>
                                            </div>
                                            <span className="text-gray-500">→</span>
                                          </button>
                                        ))}
                                      </>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => { triggerHapticFeedback(window); setShowLeagueChallenges(true); }}
                                      className="col-span-2 flex items-center gap-3 p-4 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/10 border border-amber-500/30 text-left"
                                    >
                                      <span className="text-2xl">⚔️</span>
                                      <div className="min-w-0 flex-1">
                                        <p className="font-bold text-white">League Competition</p>
                                        <p className="text-sm text-amber-200/90">Teams competing · First to target PEARLS wins prize</p>
                                      </div>
                                      <span className="text-gray-400">→</span>
                                    </button>
                                  </div>
                                </section>

                                {/* Grid 5: Global competitions */}
                                <section>
                                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Global competitions</h3>
                                  <div className="grid grid-cols-2 gap-3">
                                    <button
                                      type="button"
                                      onClick={() => { triggerHapticFeedback(window); setShowGlobalTasks(true); }}
                                      className="col-span-2 flex items-center gap-3 p-4 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/30 text-left"
                                    >
                                      <span className="text-2xl">🏆</span>
                                      <div className="min-w-0 flex-1">
                                        <p className="font-bold text-white">Joinable tasks</p>
                                        <p className="text-sm text-emerald-200/90">10 team + 10 league · Browse, invite opponent, stake · First to target wins</p>
                                      </div>
                                      <span className="text-gray-400">→</span>
                                    </button>
                                  </div>
                                </section>

                                {/* Grid 6: Management (if owner) */}
                                {hasLeadership && (
                                  <section>
                                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Management</h3>
                                    <div className="grid grid-cols-2 gap-3">
                                      <button
                                        type="button"
                                        onClick={() => { triggerHapticFeedback(window); setShowLeadershipDashboard(true); }}
                                        className="col-span-2 flex items-center gap-3 p-4 rounded-xl bg-gradient-to-br from-violet-500/20 to-indigo-500/10 border border-violet-500/30 text-left"
                                      >
                                        <span className="text-2xl">⚙️</span>
                                        <div className="min-w-0 flex-1">
                                          <p className="font-bold text-white">Team / League management</p>
                                          <p className="text-sm text-violet-200/90">Members, announcements, mute, ban, opinions</p>
                                        </div>
                                        <span className="text-gray-400">→</span>
                                      </button>
                                    </div>
                                  </section>
                                )}
                              </div>
                            )}
                          </>
                        ) : displayTasks.length === 0 ? (
                          <div className="text-center text-gray-500 py-10 rounded-xl bg-ura-panel-2/50 border border-ura-border/85 px-4">
                            <p className="font-medium text-gray-400">No activities in this section.</p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-3">
                            {displayTasks.map((task) => (
                              <button
                                key={task.id}
                                type="button"
                                onClick={() => openTaskPopup(task)}
                                className={`text-left rounded-xl border bg-gradient-to-br from-[#252836] to-[#1e2029] p-3 shadow-lg hover:border-violet-500/45 hover:from-[#2a2c38] hover:to-[#22242e] active:scale-[0.99] transition-all flex flex-col min-h-[104px] ${
                                  task.isCompleted ? 'border-emerald-500/45 ring-1 ring-emerald-500/20' : 'border-ura-border/85'
                                }`}
                              >
                                <div className="flex items-start gap-2 flex-1 min-h-0">
                                  <div className="w-10 h-10 rounded-lg bg-ura-panel-2 flex items-center justify-center shrink-0 border border-ura-border/85 overflow-hidden">
                                    {(() => {
                                      const imgSrc = getTaskImageSrc(task.image);
                                      return imgSrc ? (
                                        <Image src={imgSrc} alt="" width={36} height={36} className="object-cover w-9 h-9 rounded-md" />
                                      ) : (
                                        <IceCube className="w-5 h-5 text-[#f3ba2f]" />
                                      );
                                    })()}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-[11px] font-bold text-white leading-snug line-clamp-3">{task.title}</p>
                                    {task.type === 'REFERRAL' && task.taskData?.friendsNumber != null && (
                                      <p className="text-[10px] text-gray-400 mt-0.5 line-clamp-2">
                                        Friends needed: {Number(task.taskData.friendsNumber)}
                                      </p>
                                    )}
                                    <div className="flex items-center gap-1 mt-1.5 flex-nowrap">
                                      <Image src={pearlWhite} alt="" width={14} height={14} className="h-3.5 w-3.5 shrink-0 object-contain" />
                                      <span className="text-[11px] font-semibold text-[#f3ba2f] whitespace-nowrap">
                                        +{formatNumber(task.points)} pearls
                                      </span>
                                    </div>
                                  </div>
                                  <span className="shrink-0 mt-0.5 flex flex-col items-center gap-0.5" aria-hidden>
                                    {task.isCompleted ? (
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
                            ))}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </section>

                <PublishedActivitiesFeed
                  initData={userTelegramInitData}
                  tasks={tasks}
                  onOpenTask={openTaskPopup}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      {taskPopupEl}
      {showDailyCipher && (
        <DailyCipherPopup onClose={() => setShowDailyCipher(false)} />
      )}
      {showDailyCombo && (
        <DailyComboPopup onClose={() => setShowDailyCombo(false)} />
      )}
      {showMiniGames && (
        <MiniGamesPopup onClose={() => setShowMiniGames(false)} onlyGameId="pattern_dots" />
      )}
      {showMiniGamesHub && (
        <MiniGamesHubPopup onClose={() => setShowMiniGamesHub(false)} />
      )}
      {showLuckySpin && (
        <LuckySpinPopup onClose={() => setShowLuckySpin(false)} />
      )}
      {showMitrolabsQuiz && (
        <MitrolabsQuizPopup onClose={() => setShowMitrolabsQuiz(false)} />
      )}
      {showReceiptRush && (
        <ReceiptRushPopup onClose={() => setShowReceiptRush(false)} />
      )}
      {showWeeklyEvent && (
        <WeeklyEventPopup onClose={() => setShowWeeklyEvent(false)} />
      )}
      {showDonation && (
        <DonationPopup onClose={() => setShowDonation(false)} />
      )}
      {showCreateTeam && (
        <CreateTeamPopup
          onClose={() => setShowCreateTeam(false)}
          userBalance={pointsBalance}
          onCreate={async (name, agreedToTerms) => {
            if (!userTelegramInitData) return null;
            const res = await fetch('/api/teams', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ initData: userTelegramInitData, name, agreedToTerms }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed');
            return { id: data.id, inviteCode: data.inviteCode, name: data.name };
          }}
          onSuccess={() => { fetchTeams(); fetchLeagues(); }}
        />
      )}
      {showJoinTeam && (
        <JoinTeamPopup
          onClose={() => setShowJoinTeam(false)}
          onJoin={async (inviteCode) => {
            if (!userTelegramInitData) return false;
            const res = await fetch('/api/teams/join', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ initData: userTelegramInitData, inviteCode }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed');
            return true;
          }}
          onSuccess={() => { fetchTeams(); fetchLeagues(); }}
        />
      )}
      {showCreateLeague && (
        <CreateLeaguePopup
          onClose={() => setShowCreateLeague(false)}
          teams={myTeams.filter((t) => t.isCreator).map((t) => ({ id: t.id, name: t.name }))}
          userBalance={pointsBalance}
          onOpenCreateTeam={() => { setShowCreateLeague(false); setShowCreateTeam(true); }}
          onCreate={async (name, teamId, agreedToTerms) => {
            if (!userTelegramInitData) return null;
            const res = await fetch('/api/leagues', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ initData: userTelegramInitData, name, teamId, agreedToTerms }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed');
            return { inviteCode: data.inviteCode, inviteLink: data.inviteLink, name: data.name };
          }}
          onSuccess={() => { fetchLeagues(); fetchTeams(); }}
        />
      )}
      {showJoinLeague && (
        <JoinLeaguePopup
          onClose={() => setShowJoinLeague(false)}
          initialCode={joinLeagueInitialCode}
          onJoin={async (inviteCode) => {
            if (!userTelegramInitData) return false;
            const res = await fetch('/api/leagues/join', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ initData: userTelegramInitData, inviteCode }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed');
            return true;
          }}
          onSuccess={fetchLeagues}
        />
      )}
      {showChampionship && leaguesData && (
        <ChampionshipPopup
          onClose={() => setShowChampionship(false)}
          nextWeek={leaguesData.nextChampionshipWeek}
          topQualify={leaguesData.championship.topQualify}
          qualified={leaguesData.championship.qualified}
        />
      )}
      {showLeagueDetailId === 'current' && leaguesData && (
        <CurrentLeaguePopup data={leaguesData} onClose={() => setShowLeagueDetailId(null)} />
      )}
      {showLeagueDetailId && showLeagueDetailId !== 'current' && userTelegramInitData && (
        <LeagueDetailPopup
          leagueId={showLeagueDetailId}
          initData={userTelegramInitData}
          onClose={() => setShowLeagueDetailId(null)}
        />
      )}
      {showLeagueLevels && (
        <LeagueLevelsPopup onClose={() => setShowLeagueLevels(false)} />
      )}
      {showTeamLevels && (
        <TeamLevelsPopup onClose={() => setShowTeamLevels(false)} />
      )}
      {showBrowseTeams && (
        <BrowseTeamsPopup
          onClose={() => setShowBrowseTeams(false)}
          initData={userTelegramInitData}
          onOpenJoinTeam={() => { setShowBrowseTeams(false); setShowJoinTeam(true); }}
        />
      )}
      {showBrowseLeagues && userTelegramInitData && (
        <LeagueListPopup
          onClose={() => setShowBrowseLeagues(false)}
          initData={userTelegramInitData}
          onOpenLeague={(id) => { setShowBrowseLeagues(false); setShowLeagueDetailId(id); }}
        />
      )}
      {showLeagueChallenges && userTelegramInitData && (
        <LeagueChallengesPopup
          onClose={() => setShowLeagueChallenges(false)}
          initData={userTelegramInitData}
          onCreateChallenge={() => { setShowLeagueChallenges(false); setShowCreateLeagueChallenge(true); }}
          onViewChallenge={(id) => { setShowLeagueChallenges(false); setShowLeagueChallengeDetailId(id); }}
        />
      )}
      {showLeagueChallengeDetailId && userTelegramInitData && (
        <LeagueChallengeDetailPopup
          challengeId={showLeagueChallengeDetailId}
          onClose={() => setShowLeagueChallengeDetailId(null)}
          initData={userTelegramInitData}
          onAccept={() => setShowLeagueChallenges(true)}
        />
      )}
      {showTeamChallenges && userTelegramInitData && (
        <TeamChallengesPopup
          onClose={() => setShowTeamChallenges(false)}
          initData={userTelegramInitData}
          onCreateChallenge={() => { setShowTeamChallenges(false); setShowCreateTeamChallenge(true); }}
          onViewChallenge={(id) => { setShowTeamChallenges(false); setShowTeamChallengeDetailId(id); }}
        />
      )}
      {showTeamChallengeDetailId && userTelegramInitData && (
        <TeamChallengeDetailPopup
          challengeId={showTeamChallengeDetailId}
          onClose={() => setShowTeamChallengeDetailId(null)}
          initData={userTelegramInitData}
          onAccept={() => setShowTeamChallenges(true)}
        />
      )}
      {showCreateTeamChallenge && userTelegramInitData && (
        <CreateTeamChallengePopup
          onClose={() => setShowCreateTeamChallenge(false)}
          myTeams={myTeams}
          onCreate={async (params) => {
            const res = await fetch('/api/team-challenges', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ initData: userTelegramInitData, ...params }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed');
          }}
          onSuccess={() => { setShowTeamChallenges(true); fetchTeams(); }}
        />
      )}
      {showCreateLeagueChallenge && userTelegramInitData && leaguesData && (
        <CreateLeagueChallengePopup
          onClose={() => setShowCreateLeagueChallenge(false)}
          myLeagues={leaguesData.customLeagues.map((cl) => ({ id: cl.id, name: cl.name, isCreator: cl.isCreator }))}
          onCreate={async (params) => {
            const res = await fetch('/api/league-challenges', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ initData: userTelegramInitData, ...params }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed');
          }}
          onSuccess={fetchLeagues}
        />
      )}
      {showLeaguePointsTable && (
        <LeaguePointsTablePopup onClose={() => setShowLeaguePointsTable(false)} />
      )}
      {showLeaguesGuide && (
        <LeaguesGuidePopup onClose={() => setShowLeaguesGuide(false)} />
      )}
      {showLeadershipDashboard && userTelegramInitData && (
        <LeadershipDashboardPopup
          onClose={() => setShowLeadershipDashboard(false)}
          initData={userTelegramInitData}
          ownedTeams={ownedTeams.map((t) => ({ id: t.id, name: t.name }))}
          ownedLeagues={ownedLeagues.map((l) => ({ id: l.id, name: l.name }))}
          onSuccess={() => { fetchLeagues(); fetchTeams(); }}
        />
      )}
      {showTeamMemberDashboardId && userTelegramInitData && (
        <TeamMemberDashboardPopup
          teamId={showTeamMemberDashboardId}
          teamName={myTeams.find((t) => t.id === showTeamMemberDashboardId)?.name ?? 'Team'}
          onClose={() => setShowTeamMemberDashboardId(null)}
          initData={userTelegramInitData}
        />
      )}
      {showGlobalTasks && (
        <GlobalTasksPopup
          onClose={() => setShowGlobalTasks(false)}
          initData={userTelegramInitData}
          myTeams={myTeams}
          myLeagues={leaguesData?.customLeagues?.map((cl) => ({ id: cl.id, name: cl.name, isCreator: cl.isCreator })) ?? []}
        />
      )}
    </div>
  );
}