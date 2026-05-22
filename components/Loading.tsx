// components/Loading.tsx

/**
 * This project was developed by Open Innovations Platforms and Technologies.
 *
 * Copyright (c) Open Innovations Platforms and Technologies. All rights reserved.
 * See utils/company-info.ts for official links and the license text returned by /api/license.
 */

'use client'

import { useEffect, useState, useRef, useCallback } from 'react';
import Image from 'next/image';
import { botUrlQr, uraLanding } from '@/images';
import { calculateEnergyLimit, calculateLevelIndex, calculatePointsPerClick, calculateProfitPerHour, GameState, InitialGameState, useGameStore } from '@/utils/game-mechanics';
import UAParser from 'ua-parser-js';
import Link from 'next/link';
import { ALLOW_ALL_DEVICES } from '@/utils/consts';
import { hasAcceptedLegal, setLegalAccepted } from '@/utils/legal-acceptance';
import { triggerHapticFeedback } from '@/utils/ui';
import { readStoredDistrictSlug, writeStoredDistrictSlug } from '@/utils/user-district-storage';
import { UGANDA_DISTRICTS } from '@/utils/uganda-districts';
import {
  PENDING_SYNC_KEY,
  shouldSkipPendingRestore,
} from '@/utils/clicker-pending-sync';

interface LoadingProps {
  setIsInitialized: React.Dispatch<React.SetStateAction<boolean>>;
  setCurrentView: (view: string) => void;
  /** Deep link from lobby nav, e.g. /clicker?view=earn */
  initialView?: string | null;
}

type UserApiPayload = Record<string, unknown>;

export default function Loading({ setIsInitialized, setCurrentView, initialView }: LoadingProps) {
  const loadingDotDelays = [0, 0.35, 0.7, 1.05];
  const initializeState = useGameStore((state: GameState) => state.initializeState);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const openTimestampRef = useRef(Date.now());
  const hasInitializedRef = useRef(false);
  const [isAppropriateDevice, setIsAppropriateDevice] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [showDistrictGate, setShowDistrictGate] = useState(false);
  const [districtPickerSlug, setDistrictPickerSlug] = useState('');
  const [districtSaving, setDistrictSaving] = useState(false);
  const [districtGateError, setDistrictGateError] = useState<string | null>(null);
  const districtBootRef = useRef<{
    initData: string;
    telegramName: string;
    userData: UserApiPayload;
    unsynchronizedPoints: number;
    restoredTotalTaps: number | null;
    restoredPoints: number | null;
    restoredPointsBalance: number | null;
  } | null>(null);

  const finalizeBoot = useCallback(
    (
      userData: UserApiPayload,
      initData: string,
      telegramName: string,
      unsynchronizedPoints: number,
      restoredTotalTaps: number | null,
      restoredPoints: number | null,
      restoredPointsBalance: number | null,
    ) => {
      if (typeof userData.district === 'string' && userData.district.trim()) {
        writeStoredDistrictSlug(userData.district.trim().toLowerCase());
      } else if (Object.prototype.hasOwnProperty.call(userData, 'district') && (userData.district === null || userData.district === '')) {
        writeStoredDistrictSlug(null);
      }

      const serverTotalTaps = typeof userData.totalTaps === 'number' ? userData.totalTaps : 0;
      const totalTaps = restoredTotalTaps != null ? restoredTotalTaps : serverTotalTaps;
      const serverPoints = userData.points as number;
      const serverBalance = userData.pointsBalance as number;
      const points =
        restoredPoints != null ? Math.max(restoredPoints, serverPoints) : serverPoints;
      const pointsBalance =
        restoredPointsBalance != null
          ? Math.max(restoredPointsBalance, serverBalance)
          : serverBalance;

      const initialState: InitialGameState = {
        userTelegramInitData: initData,
        userTelegramName: telegramName,
        lastClickTimestamp: userData.lastPointsUpdateTimestamp as number,
        gameLevelIndex: calculateLevelIndex(points, totalTaps),
        points,
        pointsBalance,
        bluePearlsTotal: 0,
        totalTaps,
        unsynchronizedPoints,
        multitapLevelIndex: userData.multitapLevelIndex as number,
        pointsPerClick: calculatePointsPerClick(userData.multitapLevelIndex as number),
        energy: userData.energy as number,
        maxEnergy: calculateEnergyLimit(userData.energyLimitLevelIndex as number),
        energyRefillsLeft: userData.energyRefillsLeft as number,
        energyLimitLevelIndex: userData.energyLimitLevelIndex as number,
        lastEnergyRefillTimestamp: userData.lastEnergyRefillsTimestamp as number,
        mineLevelIndex: userData.mineLevelIndex as number,
        profitPerHour: calculateProfitPerHour(userData.mineLevelIndex as number),
        tonWalletAddress: (userData.tonWalletAddress as string | null | undefined) ?? null,
        totalDonatedPoints: typeof userData.totalDonatedPoints === 'number' ? userData.totalDonatedPoints : 0,
        isFrozen: Boolean(userData.isFrozen),
        suspensionReason: typeof userData.suspensionReason === 'string' ? userData.suspensionReason : null,
        lastServerConfirmedAt:
          typeof userData.lastServerConfirmedAt === 'number' ? userData.lastServerConfirmedAt : Date.now(),
        lastServerFailedAt:
          typeof userData.lastServerFailedAt === 'number' ? userData.lastServerFailedAt : null,
      };

      if (!hasInitializedRef.current) {
        hasInitializedRef.current = true;
        initializeState(initialState);
      }
      setShowDistrictGate(false);
      districtBootRef.current = null;
      setIsDataLoaded(true);
    },
    [initializeState],
  );

  const fetchOrCreateUser = useCallback(async () => {
    setLoadError(null);
    try {
      let initData: string | undefined, telegramName: string | undefined, startParam;

      if (typeof window !== 'undefined') {
        const WebApp = (await import('@twa-dev/sdk')).default;
        WebApp.ready();
        initData = WebApp.initData;
        telegramName = WebApp.initDataUnsafe.user?.first_name || 'Unknown User';
        startParam = WebApp.initDataUnsafe.start_param;
        // Fallback: referral link may pass startapp in URL when opening the app
        if (!startParam && window.location?.search) {
          const params = new URLSearchParams(window.location.search);
          startParam = params.get('startapp') ?? params.get('start_param') ?? undefined;
        }
      }

      const normalizedStartParam = startParam ? String(startParam).trim() : '';
      const referrerTelegramId = normalizedStartParam
        ? normalizedStartParam.replace(/^(kentId|ref_)/i, '').trim() || null
        : null;

      const allowWithoutTelegram =
        process.env.NODE_ENV === 'development' ||
        process.env.NEXT_PUBLIC_BYPASS_TELEGRAM_AUTH === 'true' ||
        process.env.NEXT_PUBLIC_VERCEL_ENV === 'preview';

      if (allowWithoutTelegram) {
        if (!initData) initData = 'dev-local-bypass';
        if (!telegramName || telegramName === 'Unknown User') {
          telegramName = process.env.NEXT_PUBLIC_DEV_DISPLAY_NAME || 'Preview';
        }
      }

      const storedDistrict = readStoredDistrictSlug();

      const apiUrl = typeof window !== 'undefined' ? `${window.location.origin}/api/user` : '/api/user';
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegramInitData: initData || '',
          referrerTelegramId,
          ...(storedDistrict ? { district: storedDistrict } : {}),
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const msg = typeof data?.message === 'string' ? data.message : (typeof data?.error === 'string' ? data.error : `Request failed (${response.status})`);
        throw new Error(msg);
      }

      const userData = data as UserApiPayload;

      if (!initData) {
        throw new Error('Open URAPearls from Telegram, or run with npm run dev (local bypass).');
      }
      if (!telegramName) {
        throw new Error('Missing display name. Open from Telegram or set NEXT_PUBLIC_DEV_DISPLAY_NAME.');
      }

      let unsynchronizedPoints = 0;
      let restoredTotalTaps: number | null = null;
      let restoredPoints: number | null = null;
      let restoredPointsBalance: number | null = null;
      try {
        const raw = typeof window !== 'undefined' ? localStorage.getItem(PENDING_SYNC_KEY) : null;
        if (raw) {
          const saved = JSON.parse(raw) as {
            unsynchronizedPoints?: number;
            totalTaps?: number;
            points?: number;
            pointsBalance?: number;
            savedAt?: number;
          };
          const age = saved.savedAt != null ? Date.now() - saved.savedAt : Infinity;
          if (age < 5 * 60 * 1000) {
            if (typeof saved.totalTaps === 'number') restoredTotalTaps = saved.totalTaps;
            if (typeof saved.points === 'number') restoredPoints = saved.points;
            if (typeof saved.pointsBalance === 'number') restoredPointsBalance = saved.pointsBalance;
            if (
              typeof saved.unsynchronizedPoints === 'number' &&
              saved.unsynchronizedPoints > 0 &&
              !shouldSkipPendingRestore(saved.unsynchronizedPoints)
            ) {
              unsynchronizedPoints = saved.unsynchronizedPoints;
            }
          }
          localStorage.removeItem(PENDING_SYNC_KEY);
        }
      } catch { /* ignore */ }

      const hasDistrict =
        typeof userData.district === 'string' && userData.district.trim().length > 0;
      const skipDistrictGate =
        allowWithoutTelegram || process.env.NEXT_PUBLIC_SKIP_DISTRICT_GATE === 'true';

      if (!hasDistrict && !skipDistrictGate) {
        districtBootRef.current = {
          initData,
          telegramName: telegramName!,
          userData,
          unsynchronizedPoints,
          restoredTotalTaps,
          restoredPoints,
          restoredPointsBalance,
        };
        setDistrictPickerSlug('');
        setDistrictGateError(null);
        setShowDistrictGate(true);
        return;
      }

      finalizeBoot(
        userData,
        initData,
        telegramName!,
        unsynchronizedPoints,
        restoredTotalTaps,
        restoredPoints,
        restoredPointsBalance,
      );
    } catch (error) {
      console.error('Error fetching user data:', error);
      const message = error instanceof Error ? error.message : 'Connection failed. Check your network.';
      setShowDistrictGate(false);
      districtBootRef.current = null;
      setLoadError(message);
    }
  }, [finalizeBoot]);

  const submitDistrictAndContinue = useCallback(async () => {
    const slug = districtPickerSlug.trim().toLowerCase();
    if (!slug) {
      setDistrictGateError('Please select your district to continue.');
      triggerHapticFeedback(window);
      return;
    }
    const boot = districtBootRef.current;
    if (!boot) {
      setDistrictGateError('Session expired. Close and reopen the app.');
      return;
    }
    setDistrictSaving(true);
    setDistrictGateError(null);
    try {
      const apiUrl = typeof window !== 'undefined' ? `${window.location.origin}/api/user` : '/api/user';
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegramInitData: boot.initData,
          district: slug,
        }),
      });
      const userData = (await res.json()) as UserApiPayload;
      if (!res.ok) {
        const msg =
          typeof userData.message === 'string'
            ? userData.message
            : typeof userData.error === 'string'
              ? userData.error
              : `Request failed (${res.status})`;
        throw new Error(msg);
      }
      if (typeof userData.district !== 'string' || !userData.district.trim()) {
        throw new Error('District was not saved. Please try again.');
      }
      triggerHapticFeedback(window);
      finalizeBoot(
        userData,
        boot.initData,
        boot.telegramName,
        boot.unsynchronizedPoints,
        boot.restoredTotalTaps,
        boot.restoredPoints,
        boot.restoredPointsBalance,
      );
    } catch (e) {
      setDistrictGateError(e instanceof Error ? e.message : 'Could not save district');
    } finally {
      setDistrictSaving(false);
    }
  }, [districtPickerSlug, finalizeBoot]);

  const handleRetry = useCallback(() => {
    setShowDistrictGate(false);
    districtBootRef.current = null;
    setIsRetrying(true);
    fetchOrCreateUser().finally(() => setIsRetrying(false));
  }, [fetchOrCreateUser]);

  useEffect(() => {
    const parser = new UAParser();
    const device = parser.getDevice();
    const isAppropriate = ALLOW_ALL_DEVICES || device.type === 'mobile' || device.type === 'tablet';
    setIsAppropriateDevice(isAppropriate);

    if (isAppropriate) {
      fetchOrCreateUser();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchOrCreateUser]);

  useEffect(() => {
    if (isDataLoaded && hasAcceptedLegal()) {
      const currentTime = Date.now();
      const elapsedTime = currentTime - openTimestampRef.current;
      const remainingTime = Math.max(5500 - elapsedTime, 0);

      const timer = setTimeout(() => {
        const view =
          initialView && initialView !== 'loading' ? initialView : 'home';
        setCurrentView(view);
        setIsInitialized(true);
      }, remainingTime);

      return () => clearTimeout(timer);
    }
  }, [isDataLoaded, initialView, setIsInitialized, setCurrentView]);

  if (showDistrictGate) {
    return (
      <div className="bg-ura-page flex justify-center min-h-screen px-4 py-8">
        <div className="w-full max-w-md flex flex-col text-white">
          <h1 className="text-xl font-bold text-center mb-1">Choose your district</h1>
          <p className="text-sm text-gray-400 text-center mb-6">
            Uganda district is required for rankings and local leaderboards. You can change this later in Settings.
          </p>
          <label htmlFor="district-gate-select" className="text-xs font-semibold text-gray-400 mb-1">
            District of residence
          </label>
          <select
            id="district-gate-select"
            value={districtPickerSlug}
            onChange={(e) => {
              setDistrictPickerSlug(e.target.value);
              setDistrictGateError(null);
            }}
            className="w-full rounded-xl bg-ura-panel text-white text-sm px-4 py-3 border border-gray-600 outline-none focus:border-[#f3ba2f] mb-4"
          >
            <option value="">Select your district…</option>
            {[...UGANDA_DISTRICTS]
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((d) => (
                <option key={d.slug} value={d.slug}>
                  {d.name}
                </option>
              ))}
          </select>
          {districtGateError ? <p className="text-sm text-red-400 mb-3 text-center">{districtGateError}</p> : null}
          <button
            type="button"
            disabled={!districtPickerSlug || districtSaving}
            onClick={() => void submitDistrictAndContinue()}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-ura-gold to-amber-500 text-black font-bold disabled:opacity-45"
          >
            {districtSaving ? 'Saving…' : 'Continue'}
          </button>
        </div>
      </div>
    );
  }

  if (!isAppropriateDevice) {
    return (
      <div className="bg-ura-panel flex justify-center items-center h-screen">
        <div className="w-full max-w-xl text-white flex flex-col items-center">
          <h1 className="text-2xl font-bold mb-4">Play on your mobile</h1>
          <Image
            className="bg-white p-2 rounded-xl"
            src={botUrlQr}
            alt="QR Code"
            width={200}
            height={200}
          />
          <p className="mt-4">@{process.env.NEXT_PUBLIC_BOT_USERNAME || 'bot'}</p>
          <p className="mt-2">Developed by Open Innovations Platforms and Technologies</p>
        </div>
      </div>
    );
  }

  if (isDataLoaded && !hasAcceptedLegal()) {
    return (
      <div className="bg-ura-panel flex justify-center items-center min-h-screen px-4">
        <div className="w-full max-w-xl text-white flex flex-col items-center text-center">
          <h1 className="text-2xl font-bold mb-2">Welcome to URAPearls</h1>
          <p className="text-gray-400 text-sm mb-6">
            Please read and accept our Privacy Policy and Terms of Service to continue.
          </p>
          <div className="flex flex-col gap-3 w-full max-w-xs mb-6">
            <Link
              href="/clicker/privacy"
              onClick={() => triggerHapticFeedback(window)}
              className="py-3 px-4 rounded-xl bg-ura-panel-2 border border-ura-border/75 text-[#f3ba2f] font-medium text-sm"
            >
              Privacy Policy
            </Link>
            <Link
              href="/clicker/terms"
              onClick={() => triggerHapticFeedback(window)}
              className="py-3 px-4 rounded-xl bg-ura-panel-2 border border-ura-border/75 text-[#f3ba2f] font-medium text-sm"
            >
              Terms of Service
            </Link>
          </div>
          <button
            type="button"
            onClick={() => {
              triggerHapticFeedback(window);
              setLegalAccepted();
              setCurrentView('home');
              setIsInitialized(true);
            }}
            className="w-full max-w-xs py-4 rounded-xl bg-gradient-to-r from-ura-gold to-amber-500 text-black font-bold"
          >
            I Accept
          </button>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="bg-ura-panel flex justify-center items-center min-h-screen px-4 py-8">
        <div className="w-full max-w-xl text-white flex flex-col items-center text-center">
          <div className="w-64 h-64 rounded-full circle-outer p-2 mb-6">
            <div className="w-full h-full rounded-full circle-inner overflow-hidden relative">
              <Image src={uraLanding} alt="URA Landing" fill style={{ objectFit: 'cover', objectPosition: 'center' }} />
            </div>
          </div>
          <h1 className="text-2xl font-bold mb-2">Unable to load</h1>
          <p className="text-gray-400 text-sm mb-4 max-w-md">{loadError}</p>
          <p className="text-gray-500 text-xs mb-6">Open from Telegram or check your connection. If it still fails, the server or database may be unavailable.</p>
          <button
            type="button"
            onClick={handleRetry}
            disabled={isRetrying}
            className="w-full max-w-xs px-6 py-3 bg-ura-panel-2 border border-ura-border/75 text-gray-200 font-semibold rounded-xl hover:bg-[#2d3038] disabled:opacity-50 transition-colors mb-4"
          >
            {isRetrying ? 'Retrying…' : 'Retry'}
          </button>
          <div className="w-full max-w-xs border-t border-ura-border/75 pt-6 mt-2">
            <p className="text-gray-400 text-sm mb-3">Accept terms and continue to the app</p>
            <div className="flex flex-col gap-3 mb-4">
              <Link
                href="/clicker/privacy"
                onClick={() => triggerHapticFeedback(window)}
                className="py-2.5 px-4 rounded-xl bg-ura-panel-2 border border-ura-border/75 text-[#f3ba2f] font-medium text-sm"
              >
                Privacy Policy
              </Link>
              <Link
                href="/clicker/terms"
                onClick={() => triggerHapticFeedback(window)}
                className="py-2.5 px-4 rounded-xl bg-ura-panel-2 border border-ura-border/75 text-[#f3ba2f] font-medium text-sm"
              >
                Terms of Service
              </Link>
            </div>
            <button
              type="button"
              onClick={() => {
                triggerHapticFeedback(window);
                setLegalAccepted();
                handleRetry();
              }}
              disabled={isRetrying}
              className="w-full max-w-xs py-4 rounded-xl bg-gradient-to-r from-ura-gold to-amber-500 text-black font-bold disabled:opacity-50 hover:opacity-95 transition-opacity"
            >
              I Accept and continue
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-screen w-full overflow-hidden bg-ura-page">
      <Image src={uraLanding} alt="URA Landing" fill priority style={{ objectFit: 'cover', objectPosition: 'center' }} />
      <div className="absolute inset-0 bg-ura-navy/35" />
      <div className="absolute inset-0 flex flex-col items-center justify-end text-white px-4 text-center pb-28">
        <div className="w-full max-w-xs flex items-center gap-3" aria-label="Loading">
          <span className="text-base font-semibold tracking-wide">Loading</span>
          <div className="loading-trail flex-1">
            {loadingDotDelays.map((delay) => (
              <span key={delay} className="loading-trail-dot" style={{ animationDelay: `${delay}s` }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}