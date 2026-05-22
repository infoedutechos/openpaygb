/**
 * TransfersSection – Send PEARLS, Receive PEARLS, My History, Recent Activity
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import TransfersSectionView from '@/components/TransfersSectionView';
import type { TransferItem, RecentTransfer } from '@/components/TransfersSectionView.types';
import { useGameStore } from '@/utils/game-mechanics';
import { useToast } from '@/contexts/ToastContext';
import { formatNumber, triggerHapticFeedback } from '@/utils/ui';
import { TRANSFER_MIN, TRANSFER_MAX } from '@/utils/consts';

interface TransfersSectionProps {
  userTelegramInitData: string;
  onTransferSuccess?: () => void;
}

function getTelegramIdFromInitData(initData: string): string | null {
  try {
    const params = new URLSearchParams(initData);
    const userStr = params.get('user');
    if (!userStr) return null;
    const user = JSON.parse(decodeURIComponent(userStr));
    return user?.id?.toString() ?? null;
  } catch {
    return null;
  }
}

export default function TransfersSection({ userTelegramInitData, onTransferSuccess }: TransfersSectionProps) {
  const { pointsBalance, setPointsBalance } = useGameStore();
  const showToast = useToast();
  const [recipientTelegramId, setRecipientTelegramId] = useState('');
  const [amount, setAmount] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [myTransfers, setMyTransfers] = useState<TransferItem[]>([]);
  const [recentTransfers, setRecentTransfers] = useState<RecentTransfer[]>([]);
  const [isLoadingMe, setIsLoadingMe] = useState(false);
  const [isLoadingRecent, setIsLoadingRecent] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'send' | 'receive' | 'my' | 'recent'>('send');
  const [recentError, setRecentError] = useState<string | null>(null);

  const myTelegramId = getTelegramIdFromInitData(userTelegramInitData);

  const fetchMyTransfers = useCallback(async () => {
    if (!userTelegramInitData) return;
    setIsLoadingMe(true);
    try {
      const res = await fetch(`/api/transfers/me?initData=${encodeURIComponent(userTelegramInitData)}`);
      if (res.ok) {
        const data = await res.json();
        setMyTransfers(data.all ?? []);
      }
    } catch {
      setMyTransfers([]);
    } finally {
      setIsLoadingMe(false);
    }
  }, [userTelegramInitData]);

  const fetchRecentTransfers = useCallback(async () => {
    if (!userTelegramInitData) {
      setRecentError('Open the app from Telegram to see recent activity.');
      return;
    }
    setRecentError(null);
    setIsLoadingRecent(true);
    try {
      const base = typeof window !== 'undefined' ? window.location.origin : '';
      const url = `${base}/api/transfers/recent?initData=${encodeURIComponent(userTelegramInitData)}&limit=50`;
      const res = await fetch(url, { credentials: 'same-origin' });
      if (res.ok) {
        const data = await res.json();
        setRecentTransfers(data.transfers ?? []);
      } else {
        setRecentTransfers([]);
        setRecentError(res.status === 403 ? 'Session expired. Reopen from Telegram.' : 'Could not load recent activity.');
      }
    } catch {
      setRecentTransfers([]);
      setRecentError('Could not load recent activity.');
    } finally {
      setIsLoadingRecent(false);
    }
  }, [userTelegramInitData]);

  useEffect(() => {
    if (activeTab === 'my') fetchMyTransfers();
  }, [activeTab, fetchMyTransfers]);

  useEffect(() => {
    if (activeTab === 'recent') fetchRecentTransfers();
  }, [activeTab, fetchRecentTransfers]);

  const handleSend = async () => {
    if (!userTelegramInitData || isSending) return;
    const amt = Math.floor(Number(amount));
    const recipient = recipientTelegramId.trim();
    if (!recipient) {
      showToast('Enter recipient Telegram ID', 'error');
      return;
    }
    if (!Number.isFinite(amt) || amt < TRANSFER_MIN || amt > TRANSFER_MAX) {
      showToast(`${formatNumber(TRANSFER_MIN)} - ${formatNumber(TRANSFER_MAX)} PEARLS per transfer`, 'error');
      return;
    }
    if (amt > pointsBalance) {
      showToast('Insufficient balance', 'error');
      return;
    }
    setIsSending(true);
    triggerHapticFeedback(window);
    try {
      const res = await fetch('/api/transfers/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          initData: userTelegramInitData,
          recipientTelegramId: recipient,
          amount: amt,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`Sent ${formatNumber(amt)} PEARLS to ${data.transfer?.recipientName ?? 'recipient'}`, 'success');
        if (data.pointsBalance != null) setPointsBalance(data.pointsBalance);
        setRecipientTelegramId('');
        setAmount('');
        fetchMyTransfers();
        fetchRecentTransfers();
        if (onTransferSuccess) onTransferSuccess();
      } else {
        showToast(data.error || 'Failed to send', 'error');
      }
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to send', 'error');
    } finally {
      setIsSending(false);
    }
  };

  const copyTelegramId = () => {
    if (myTelegramId) {
      triggerHapticFeedback(window);
      navigator.clipboard.writeText(myTelegramId);
      setCopied(true);
      showToast('Telegram ID copied! Share it so others can send you PEARLS.', 'success');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleTabClick = (tab: 'send' | 'receive' | 'my' | 'recent') => {
    triggerHapticFeedback(window);
    setActiveTab(tab);
  };

  return (
    <TransfersSectionView
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      recipientTelegramId={recipientTelegramId}
      setRecipientTelegramId={setRecipientTelegramId}
      amount={amount}
      setAmount={setAmount}
      isSending={isSending}
      myTransfers={myTransfers}
      recentTransfers={recentTransfers}
      isLoadingMe={isLoadingMe}
      isLoadingRecent={isLoadingRecent}
      recentError={recentError}
      copied={copied}
      myTelegramId={myTelegramId}
      onSend={handleSend}
      onCopyTelegramId={copyTelegramId}
      onTabClick={handleTabClick}
    />
  );
}
