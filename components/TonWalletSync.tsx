'use client';

import { useEffect, useRef } from 'react';
import { useTonWallet } from '@tonconnect/ui-react';
import { useGameStore } from '@/utils/game-mechanics';
import { useToast } from '@/contexts/ToastContext';
import { normalizeTonAddress } from '@/lib/ton-address';

/** Persists TonConnect address to User.tonWalletAddress via /api/wallet/connect. */
export function TonWalletSync() {
  const wallet = useTonWallet();
  const userTelegramInitData = useGameStore((s) => s.userTelegramInitData);
  const setTonWalletAddress = useGameStore((s) => s.setTonWalletAddress);
  const showToast = useToast();
  const lastSyncedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!userTelegramInitData) return;

    const raw = wallet?.account?.address?.trim() ?? '';
    const addr = raw ? normalizeTonAddress(raw) : '';

    if (!addr) {
      setTonWalletAddress(null);
      if (lastSyncedRef.current) {
        lastSyncedRef.current = null;
        void fetch('/api/wallet/disconnect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ initData: userTelegramInitData }),
        }).catch(() => undefined);
      }
      return;
    }

    if (lastSyncedRef.current === addr) return;

    let cancelled = false;
    void (async () => {
      try {
        const r = await fetch('/api/wallet/connect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ initData: userTelegramInitData, walletAddress: addr }),
        });
        if (cancelled) return;
        if (!r.ok) {
          showToast('Could not save wallet to your profile. Try again.', 'error');
          return;
        }
        lastSyncedRef.current = addr;
        setTonWalletAddress(addr);
      } catch {
        if (!cancelled) {
          showToast('Could not save wallet to your profile. Check your connection.', 'error');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [wallet?.account?.address, userTelegramInitData, setTonWalletAddress, showToast]);

  return null;
}
