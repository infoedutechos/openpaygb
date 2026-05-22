'use client';

import React, { useState, useEffect } from 'react';
import IceCubes from '@/icons/IceCubes';
import { useGameStore } from '@/utils/game-mechanics';
import { formatNumber, triggerHapticFeedback } from '@/utils/ui';
import { useToast } from '@/contexts/ToastContext';
import { DONATION_MIN } from '@/utils/consts';

interface DonorRow {
  name: string;
  totalDonatedPoints: number;
}

interface DonationPopupProps {
  onClose: () => void;
}

export default function DonationPopup({ onClose }: DonationPopupProps) {
  const { userTelegramInitData, pointsBalance, setPointsBalance, setTotalDonatedPoints } = useGameStore();
  const [amount, setAmount] = useState('');
  const [isDonating, setIsDonating] = useState(false);
  const [donors, setDonors] = useState<DonorRow[]>([]);
  const [donorsLoading, setDonorsLoading] = useState(true);
  const showToast = useToast();

  useEffect(() => {
    if (!userTelegramInitData) {
      setDonorsLoading(false);
      return;
    }
    fetch(`/api/donations/leaderboard?initData=${encodeURIComponent(userTelegramInitData)}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        const raw = data.donors;
        setDonors(Array.isArray(raw) ? raw : []);
      })
      .catch(() => setDonors([]))
      .finally(() => setDonorsLoading(false));
  }, [userTelegramInitData]);

  const amt = Math.floor(Number(amount));
  const canDonate = Number.isFinite(amt) && amt >= DONATION_MIN && amt <= pointsBalance;

  const handleDonate = async () => {
    if (!userTelegramInitData || !canDonate || isDonating) return;
    setIsDonating(true);
    triggerHapticFeedback(window);
    try {
      const res = await fetch('/api/donate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData: userTelegramInitData, amount: amt }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Donation failed');
      setPointsBalance(data.pointsBalance);
      if (typeof data.totalDonatedPoints === 'number') setTotalDonatedPoints(data.totalDonatedPoints);
      setAmount('');
      showToast(`Thank you! You donated ${formatNumber(amt)} PEARLS to charity.`, 'success');
      onClose();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Donation failed', 'error');
    } finally {
      setIsDonating(false);
    }
  };

  const handleClose = () => {
    triggerHapticFeedback(window);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ura-navy/60 p-0 sm:items-center sm:p-4">
      <div className="max-h-[90dvh] w-full max-w-xl flex flex-col overflow-hidden animate-slide-up rounded-t-3xl bg-ura-panel sm:max-h-[85vh] sm:rounded-2xl">
        <div className="px-5 pt-6 pb-4 flex justify-between items-start flex-shrink-0">
          <div>
            <h2 className="text-xl font-bold text-white">Donation Center</h2>
            <p className="text-sm text-gray-400">Donate PEARLS for charity</p>
          </div>
          <button onClick={handleClose} className="text-gray-400 hover:text-white text-2xl w-8 h-8">&times;</button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-8">
          <div className="bg-ura-panel-2 rounded-xl p-4 mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400">Available</span>
              <span className="text-[#f3ba2f] font-bold flex items-center gap-1">
                <IceCubes className="w-5 h-5" />
                {formatNumber(Math.floor(pointsBalance))}
              </span>
            </div>
          </div>

          <p className="text-sm text-gray-400 mb-4">
            Your donation goes to charity. Donors get a star on their profile.
          </p>

          <div className="space-y-3 mb-6">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={`Min ${formatNumber(DONATION_MIN)} PEARLS`}
              className="w-full bg-ura-panel-2 rounded-lg px-4 py-3 text-white placeholder-gray-500"
              min={DONATION_MIN}
            />
            <button
              onClick={handleDonate}
              disabled={!canDonate || isDonating}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold disabled:opacity-50"
            >
              {isDonating ? 'Donating…' : 'Donate'}
            </button>
          </div>

          <h3 className="text-base font-bold text-white mb-3 mt-6">Global donors</h3>
          <p className="text-sm text-gray-400 mb-3">
            Everyone who has donated to charity (by total donated).{donors.length > 0 ? ` ${donors.length} donor${donors.length !== 1 ? 's' : ''}.` : ''}
          </p>
          {donorsLoading ? (
            <p className="text-gray-500 text-sm">Loading donors…</p>
          ) : donors.length === 0 ? (
            <p className="text-gray-500 text-sm">No donors yet. Be the first!</p>
          ) : (
            <div className="space-y-2 max-h-56 overflow-y-auto rounded-xl bg-ura-panel-2 p-3">
              {donors.map((d, i) => (
                <div key={`donor-${i}-${d.totalDonatedPoints}-${String(d.name).slice(0, 20)}`} className="flex justify-between items-center py-2 px-3 rounded-lg bg-ura-panel">
                  <span className="text-white font-medium truncate">{d.name}</span>
                  <span className="text-[#f3ba2f] font-semibold text-sm whitespace-nowrap ml-2">
                    {formatNumber(Number(d.totalDonatedPoints) || 0)} PEARLS
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
