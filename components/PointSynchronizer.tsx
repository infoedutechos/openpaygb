// components/PointSynchronizer.tsx

/**
 * This project was developed by Open Innovations Platforms and Technologies.
 *
 * Copyright (c) Open Innovations Platforms and Technologies. All rights reserved.
 * See utils/company-info.ts for official links and the license text returned by /api/license.
 */

'use client'

import { useEffect, useCallback, useRef, useState } from 'react';
import { useGameStore } from '@/utils/game-mechanics';
import { useToast } from '@/contexts/ToastContext';
import { notifyPearlBalancesRefresh, PEARLS_BALANCE_REFRESH_EVENT } from '@/utils/pearl-balance-events';
import { applyPearlsMeClientPayload } from '@/utils/apply-pearls-me-client';
import {
    clearPendingSyncKeys,
    markBeaconSync,
    PENDING_SYNC_KEY,
} from '@/utils/clicker-pending-sync';

export function PointSynchronizer() {
    const showToast = useToast();
    const {
        userTelegramInitData,
        energy,
        unsynchronizedPoints,
        points,
        pointsBalance,
        lastClickTimestamp,
        totalTaps,
        pointsPerClick,
        profitPerHour,
        resetUnsynchronizedPoints,
        setPoints,
        setPointsBalance,
        setTotalTaps,
        setEnergy,
        setFrozenState,
        recordServerConfirmed,
        recordServerFailed,
    } = useGameStore();

    /** Server answered (any HTTP status < 500). Network errors handled in catch. */
    const applyReachabilityFromHttpResponse = useCallback((res: Response) => {
        if (res.ok || res.status < 500) {
            recordServerConfirmed();
        } else {
            recordServerFailed();
        }
    }, [recordServerConfirmed, recordServerFailed]);

    const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const [isSyncing, setIsSyncing] = useState(false);

    const syncWithServer = useCallback(async () => {
        if (unsynchronizedPoints < 1 || isSyncing) return;
        setIsSyncing(true);
        const pointsToSync = unsynchronizedPoints;
        const syncTimestamp = Date.now();
        //showToast(`Trying to synchronize ${pointsToSync}`, 'success');

        try {
            const response = await fetch('/api/sync', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    initData: userTelegramInitData,
                    unsynchronizedPoints: pointsToSync,
                    currentEnergy: energy,
                    syncTimestamp,
                }),
            });

            const errorData = !response.ok ? await response.json().catch(() => ({})) : {};
            applyReachabilityFromHttpResponse(response);

            if (!response.ok) {
                if (response.status === 403 && errorData.suspended) {
                    setFrozenState(true, errorData.suspensionReason || null);
                    return;
                }
                showToast(
                    `Failed to sync with server: ${(errorData as { error?: string }).error || response.statusText}`,
                    'error'
                );
                return;
            }

            const data = await response.json();

            resetUnsynchronizedPoints(pointsToSync);
            const updPts = Number(data.updatedPoints);
            const updBal = Number(data.updatedPointsBalance);
            const updEnergy = Number(data.updatedEnergy);
            if (Number.isFinite(updPts)) setPoints(Math.floor(updPts));
            if (Number.isFinite(updBal)) setPointsBalance(Math.floor(updBal));
            if (Number.isFinite(updEnergy)) setEnergy(Math.floor(updEnergy));
            // Taps: use server value if present, else add taps from this sync so total never drops after sync
            const tapsFromThisSync = pointsPerClick > 0 ? Math.floor(pointsToSync / pointsPerClick) : 0;
            const minimumTotalTaps = totalTaps + tapsFromThisSync;
            const newTotalTaps = typeof data.updatedTotalTaps === 'number'
                ? Math.max(data.updatedTotalTaps, minimumTotalTaps)
                : minimumTotalTaps;
            setTotalTaps(newTotalTaps);
            clearPendingSyncKeys();
            notifyPearlBalancesRefresh();
            //showToast(`Successfully synchronized! Points synced: ${pointsToSync}`, 'success');
        } catch (error) {
            recordServerFailed();
            showToast(`Error syncing with server: ${error instanceof Error ? error.message : String(error)}`, 'error');
            console.error('Error syncing with server:', error);
        } finally {
            setIsSyncing(false);
        }
    }, [applyReachabilityFromHttpResponse, energy, isSyncing, pointsPerClick, recordServerFailed, resetUnsynchronizedPoints, setEnergy, setPoints, setPointsBalance, setTotalTaps, setFrozenState, showToast, totalTaps, unsynchronizedPoints, userTelegramInitData]);

    /** Credit passive mine on server when user is not tapping (unsynchronizedPoints = 0). */
    const syncPassiveMine = useCallback(async () => {
        if (isSyncing || !userTelegramInitData || profitPerHour < 1) return;
        setIsSyncing(true);
        try {
            const response = await fetch('/api/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    initData: userTelegramInitData,
                    unsynchronizedPoints: 0,
                    currentEnergy: energy,
                    syncTimestamp: Date.now(),
                }),
            });
            applyReachabilityFromHttpResponse(response);
            if (!response.ok) return;
            const data = await response.json();
            const updPts = Number(data.updatedPoints);
            const updBal = Number(data.updatedPointsBalance);
            const updEnergy = Number(data.updatedEnergy);
            if (Number.isFinite(updPts)) setPoints(Math.floor(updPts));
            if (Number.isFinite(updBal)) setPointsBalance(Math.floor(updBal));
            if (Number.isFinite(updEnergy)) setEnergy(Math.floor(updEnergy));
            notifyPearlBalancesRefresh();
        } catch {
            recordServerFailed();
        } finally {
            setIsSyncing(false);
        }
    }, [
        applyReachabilityFromHttpResponse,
        energy,
        isSyncing,
        profitPerHour,
        recordServerFailed,
        setEnergy,
        setPoints,
        setPointsBalance,
        userTelegramInitData,
    ]);

    /** Keeps lifetime points, white balance, and blue total in sync when Home is not mounted (e.g. Earn → Wallet). */
    useEffect(() => {
        if (!userTelegramInitData) return;
        const pullPearls = async () => {
            try {
                const res = await fetch('/api/pearls/me', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ initData: userTelegramInitData }),
                });
                if (res.ok || res.status < 500) {
                    recordServerConfirmed();
                } else {
                    recordServerFailed();
                }
                if (!res.ok) return;
                const data = await res.json();
                applyPearlsMeClientPayload(data, useGameStore.getState());
            } catch {
                recordServerFailed();
            }
        };
        void pullPearls();
        const onPearlRefresh = () => {
            void pullPearls();
        };
        window.addEventListener(PEARLS_BALANCE_REFRESH_EVENT, onPearlRefresh);
        return () => window.removeEventListener(PEARLS_BALANCE_REFRESH_EVENT, onPearlRefresh);
    }, [recordServerConfirmed, recordServerFailed, userTelegramInitData]);

    /** DB connectivity independent of Telegram init (same origin as mini app). */
    useEffect(() => {
        const ctrl = new AbortController();
        const pingHealth = async () => {
            if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
            try {
                const res = await fetch('/api/health', { signal: ctrl.signal, cache: 'no-store' });
                const body = await res.json().catch(() => ({})) as { ok?: boolean };
                if (res.ok && body?.ok === true) {
                    useGameStore.getState().recordServerConfirmed();
                } else {
                    useGameStore.getState().recordServerFailed();
                }
            } catch {
                if (!ctrl.signal.aborted) {
                    useGameStore.getState().recordServerFailed();
                }
            }
        };
        void pingHealth();
        const interval = setInterval(pingHealth, 45_000);
        const onVis = () => {
            if (document.visibilityState === 'visible') void pingHealth();
        };
        document.addEventListener('visibilitychange', onVis);
        return () => {
            ctrl.abort();
            clearInterval(interval);
            document.removeEventListener('visibilitychange', onVis);
        };
    }, []);

    // Sync every 600ms when there's pending
    useEffect(() => {
        if (syncTimeoutRef.current) {
            clearTimeout(syncTimeoutRef.current);
        }

        syncTimeoutRef.current = setTimeout(() => {
            if (unsynchronizedPoints >= 1) {
                syncWithServer();
            }
        }, 600);

        return () => {
            if (syncTimeoutRef.current) {
                clearTimeout(syncTimeoutRef.current);
            }
        };
    }, [lastClickTimestamp, unsynchronizedPoints, syncWithServer]);

    // Passive mine: server credits calculateMinedPoints when sync runs with 0 tap queue
    useEffect(() => {
        if (profitPerHour < 1 || !userTelegramInitData) return;
        const id = setInterval(() => {
            if (unsynchronizedPoints < 1 && !isSyncing) {
                void syncPassiveMine();
            }
        }, 60_000);
        return () => clearInterval(id);
    }, [profitPerHour, unsynchronizedPoints, isSyncing, syncPassiveMine, userTelegramInitData]);

    // Persist pending to localStorage every 500ms while there's pending (survives force-close without visibility)
    useEffect(() => {
        if (unsynchronizedPoints < 1) return;
        const id = setInterval(() => {
            try {
                localStorage.setItem(PENDING_SYNC_KEY, JSON.stringify({
                    unsynchronizedPoints,
                    points,
                    pointsBalance,
                    totalTaps,
                    savedAt: Date.now(),
                }));
            } catch { /* ignore */ }
        }, 500);
        return () => clearInterval(id);
    }, [unsynchronizedPoints, points, pointsBalance, totalTaps]);

    // Persist pending to localStorage when user leaves (same pattern as Settings / NotificationCenter)
    const pendingSyncRef = useRef({ initData: '', points: 0, energy: 0 });
    pendingSyncRef.current = {
        initData: userTelegramInitData,
        points: unsynchronizedPoints,
        energy,
    };

    useEffect(() => {
        const savePendingToStorage = () => {
            if (unsynchronizedPoints < 1) return;
            try {
                const payload = {
                    unsynchronizedPoints,
                    points,
                    pointsBalance,
                    totalTaps,
                    savedAt: Date.now(),
                };
                localStorage.setItem(PENDING_SYNC_KEY, JSON.stringify(payload));
            } catch { /* ignore */ }
        };

        const sendSyncBeacon = () => {
            if (isSyncing) return;
            const { initData, points: p, energy: e } = pendingSyncRef.current;
            if (p < 1 || !initData) return;
            savePendingToStorage();
            markBeaconSync(p);
            resetUnsynchronizedPoints(p);
            const url = typeof window !== 'undefined' ? `${window.location.origin}/api/sync` : '/api/sync';
            const body = JSON.stringify({
                initData,
                unsynchronizedPoints: p,
                currentEnergy: e,
                syncTimestamp: Date.now(),
            });
            navigator.sendBeacon?.(url, new Blob([body], { type: 'application/json' }));
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden') {
                savePendingToStorage();
                sendSyncBeacon();
            }
        };

        const handlePageHide = () => {
            savePendingToStorage();
            sendSyncBeacon();
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('pagehide', handlePageHide);
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('pagehide', handlePageHide);
        };
    }, [unsynchronizedPoints, isSyncing, points, pointsBalance, resetUnsynchronizedPoints, totalTaps]);

    return null;
}