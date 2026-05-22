// components/Marketplace.tsx
/**
 * P2P Marketplace – sell PEARLS for TON, buy PEARLS with TON (TonConnect).
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import IceCube from '@/icons/IceCube';
import { useGameStore } from '@/utils/game-mechanics';
import { formatNumber, triggerHapticFeedback } from '@/utils/ui';
import { useToast } from '@/contexts/ToastContext';
import { MARKETPLACE_MIN_LISTING } from '@/utils/consts';
import { useTonConnectUI } from '@tonconnect/ui-react';
import { toNano } from '@ton/core';

type Tab = 'buy' | 'sell' | 'activity';

interface ListingItem {
  id: string;
  sellerId: string;
  sellerName: string;
  sellerTonAddress?: string;
  amount: number;
  totalAmount: number;
  pricePerUnit: number;
  currency: string;
  createdAt: string;
}

interface MyListing {
  id: string;
  amount: number;
  remainingAmount: number;
  currency: string;
  status: string;
  createdAt: string;
}

interface MyTrade {
  id: string;
  listingId: string;
  amount: number;
  amountPaid: number;
  sellerReceived: number;
  fee: number;
  currency: string;
  status: string;
  createdAt: string;
}

export function MarketplaceSection() {
  const [tonConnectUI] = useTonConnectUI();
  const { userTelegramInitData, pointsBalance, setPointsBalance, tonWalletAddress } = useGameStore();
  const [tab, setTab] = useState<Tab>('buy');
  const [listings, setListings] = useState<ListingItem[]>([]);
  const [myListings, setMyListings] = useState<MyListing[]>([]);
  const [myTrades, setMyTrades] = useState<MyTrade[]>([]);
  const [pointsInMarketplace, setPointsInMarketplace] = useState(0);
  const [isLoadingListings, setIsLoadingListings] = useState(true);
  const [isLoadingMe, setIsLoadingMe] = useState(true);
  const [sellAmount, setSellAmount] = useState('');
  const [sellPriceTon, setSellPriceTon] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [buyListingId, setBuyListingId] = useState('');
  const [buyAmount, setBuyAmount] = useState('');
  const [isBuying, setIsBuying] = useState(false);
  const showToast = useToast();

  const fetchListings = useCallback(async () => {
    if (!userTelegramInitData) return;
    setIsLoadingListings(true);
    try {
      const res = await fetch(`/api/marketplace/listings?initData=${encodeURIComponent(userTelegramInitData)}`);
      if (res.ok) {
        const data = await res.json();
        setListings(data.listings ?? []);
      }
    } catch {
      setListings([]);
    } finally {
      setIsLoadingListings(false);
    }
  }, [userTelegramInitData]);

  const fetchMe = useCallback(async () => {
    if (!userTelegramInitData) return;
    setIsLoadingMe(true);
    try {
      const res = await fetch(`/api/marketplace/me?initData=${encodeURIComponent(userTelegramInitData)}`);
      if (res.ok) {
        const data = await res.json();
        setMyListings(data.listings ?? []);
        setMyTrades(data.trades ?? []);
        setPointsInMarketplace(data.pointsInMarketplace ?? 0);
        if (data.pointsBalance != null) setPointsBalance(data.pointsBalance);
      }
    } catch {
      setMyListings([]);
      setMyTrades([]);
    } finally {
      setIsLoadingMe(false);
    }
  }, [userTelegramInitData, setPointsBalance]);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  const handleCreateListing = async () => {
    if (!userTelegramInitData || isCreating) return;
    if (!tonWalletAddress) {
      showToast('Connect TON wallet in Drops tab to receive TON', 'error');
      return;
    }
    const amt = Math.floor(Number(sellAmount));
    if (!Number.isFinite(amt) || amt < MARKETPLACE_MIN_LISTING) {
      showToast(`Min ${MARKETPLACE_MIN_LISTING.toLocaleString()} PEARLS`, 'error');
      return;
    }
    const priceTon = Number(sellPriceTon);
    if (!Number.isFinite(priceTon) || priceTon <= 0) {
      showToast('Enter price in TON (e.g. 0.001 per 1000 PEARLS)', 'error');
      return;
    }
    setIsCreating(true);
    triggerHapticFeedback(window);
    try {
      const res = await fetch('/api/marketplace/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData: userTelegramInitData, amount: amt, priceInTon: priceTon }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('Listing created', 'success');
        setSellAmount('');
        setSellPriceTon('');
        if (data.pointsBalance != null) setPointsBalance(data.pointsBalance);
        fetchListings();
        fetchMe();
      } else {
        showToast(data.error || 'Failed to create listing', 'error');
      }
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed', 'error');
    } finally {
      setIsCreating(false);
    }
  };

  const handleCancelListing = async (listingId: string) => {
    if (!userTelegramInitData) return;
    triggerHapticFeedback(window);
    try {
      const res = await fetch(`/api/marketplace/listings/${listingId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData: userTelegramInitData }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('Listing cancelled', 'success');
        if (data.pointsBalance != null) setPointsBalance(data.pointsBalance);
        fetchListings();
        fetchMe();
      } else {
        showToast(data.error || 'Failed to cancel', 'error');
      }
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed', 'error');
    }
  };

  const handleBuy = async (listing: ListingItem, amount: number) => {
    if (!userTelegramInitData || isBuying) return;
    if (!tonConnectUI.account) {
      showToast('Connect your TON wallet (Drops tab) to pay', 'error');
      return;
    }
    if (!listing.sellerTonAddress) {
      showToast('Seller wallet not set', 'error');
      return;
    }
    const buyAmountNum = Math.floor(amount);
    const tonAmount = buyAmountNum * listing.pricePerUnit;
    if (tonAmount <= 0) {
      showToast('Invalid amount', 'error');
      return;
    }
    setIsBuying(true);
    triggerHapticFeedback(window);
    try {
      const nanoTon = toNano(tonAmount.toString()).toString();
      await tonConnectUI.sendTransaction({
        validUntil: Math.floor(Date.now() / 1000) + 300,
        messages: [
          {
            address: listing.sellerTonAddress,
            amount: nanoTon,
          },
        ],
      });
      const res = await fetch('/api/marketplace/buy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData: userTelegramInitData, listingId: listing.id, amount: buyAmountNum }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Bought ${formatNumber(data.amount)} PEARLS`, 'success');
        setBuyListingId('');
        setBuyAmount('');
        if (data.pointsBalance != null) setPointsBalance(data.pointsBalance);
        fetchListings();
        fetchMe();
      } else {
        showToast(data.error || 'Purchase failed', 'error');
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes('Operation aborted') || msg.includes('aborted')) {
        showToast('Transaction cancelled', 'error');
      } else {
        showToast(msg || 'Failed', 'error');
      }
    } finally {
      setIsBuying(false);
    }
  };

  return (
    <div className="relative mt-4">
                <div className="flex items-center justify-center gap-4 mb-6 p-4 rounded-2xl bg-ura-panel-2 border border-ura-border/75">
                  <div className="text-center">
                    <p className="text-gray-400 text-xs">Available</p>
                    <p className="text-[#f3ba2f] font-bold flex items-center justify-center gap-1">
                      <IceCube className="w-5 h-5" />
                      {formatNumber(pointsBalance ?? 0)} PEARLS
                    </p>
                  </div>
                  <div className="w-px h-10 bg-[#3d4046]" />
                  <div className="text-center">
                    <p className="text-gray-400 text-xs">In listings</p>
                    <p className="text-amber-400/90 font-bold">{formatNumber(pointsInMarketplace)} PEARLS</p>
                  </div>
                </div>

                <div className="flex gap-1 p-1 rounded-xl bg-ura-panel-2 border border-ura-border/85 mb-4">
                  {(['buy', 'sell', 'activity'] as Tab[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => { triggerHapticFeedback(window); setTab(t); }}
                      className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-semibold capitalize ${
                        tab === t
                          ? 'bg-gradient-to-r from-amber-600 to-[#f3ba2f] text-black'
                          : 'text-gray-400 hover:text-white hover:bg-ura-panel-2'
                      }`}
                    >
                      {t === 'activity' ? 'My activity' : t}
                    </button>
                  ))}
                </div>

                <div className="mb-6 p-4 rounded-xl bg-ura-panel-2/80 border border-amber-500/30">
                  <p className="text-amber-400/90 font-semibold text-sm mb-2">How it works</p>
                  <p className="text-gray-300 text-xs leading-relaxed mb-2">
                    <span className="text-white font-medium">Sell:</span> Connect TON wallet (Drops tab) → set amount PEARLS and price (TON per 1000 PEARLS) → List for TON → PEARLS is escrowed until sold or cancelled.
                  </p>
                  <p className="text-gray-300 text-xs leading-relaxed">
                    <span className="text-white font-medium">Buy:</span> Connect TON wallet → choose listing → enter PEARLS amount → Pay TON → TonConnect sends TON to seller → you receive PEARLS.
                  </p>
                </div>

                {tab === 'buy' && (
                  <>
                    <p className="text-gray-400 text-sm mb-2">Pay with TON. Connect wallet in Drops tab to pay.</p>
                    {isLoadingListings ? (
                      <p className="text-center text-gray-400 py-8">Loading listings...</p>
                    ) : listings.length === 0 ? (
                      <div className="text-center py-8 rounded-xl bg-ura-panel-2/50 border border-ura-border/85">
                        <p className="text-gray-400">No listings yet. Be the first to sell!</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {listings.map((l) => {
                          const tonPer1k = (l.pricePerUnit * 1000).toFixed(4);
                          return (
                            <div
                              key={l.id}
                              className="p-4 rounded-xl bg-ura-panel-2 border border-ura-border/75"
                            >
                              <div className="flex justify-between items-start mb-2">
                                <span className="text-white font-semibold">{formatNumber(l.amount)} PEARLS</span>
                                <span className="text-gray-400 text-sm">{l.sellerName}</span>
                              </div>
                              <p className="text-gray-400 text-xs mb-3">{tonPer1k} TON per 1000 PEARLS</p>
                              {buyListingId === l.id ? (
                                <div className="flex gap-2 items-center">
                                  <input
                                    type="number"
                                    min={1}
                                    max={l.amount}
                                    value={buyAmount}
                                    onChange={(e) => setBuyAmount(e.target.value)}
                                    placeholder="Amount PEARLS"
                                    className="flex-1 rounded-lg bg-ura-panel border border-ura-border/75 px-3 py-2 text-white"
                                  />
                                  <button
                                    onClick={() => handleBuy(l, Math.floor(Number(buyAmount)))}
                                    disabled={isBuying || !buyAmount || Number(buyAmount) <= 0}
                                    className="py-2 px-4 rounded-lg bg-ura-gold text-black font-bold disabled:opacity-50"
                                  >
                                    {isBuying ? '...' : 'Pay TON'}
                                  </button>
                                  <button
                                    onClick={() => { setBuyListingId(''); setBuyAmount(''); }}
                                    className="py-2 px-3 rounded-lg bg-[#3d4046] text-gray-300"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setBuyListingId(l.id)}
                                  className="w-full py-2 rounded-lg bg-gradient-to-r from-amber-500 to-[#f3ba2f] text-black font-bold"
                                >
                                  Buy with TON
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}

                {tab === 'sell' && (
                  <>
                    <p className="text-gray-400 text-sm mb-2">List PEARLS for TON. Connect TON wallet in Drops tab to receive payments.</p>
                    {!tonWalletAddress && (
                      <p className="text-amber-400/90 text-sm mb-3">Connect your TON wallet in the Drops tab first.</p>
                    )}
                    <div className="p-4 rounded-xl bg-ura-panel-2 border border-ura-border/75 mb-4">
                      <label className="block text-gray-400 text-sm mb-2">Amount to sell (PEARLS)</label>
                      <input
                        type="number"
                        min={MARKETPLACE_MIN_LISTING}
                        value={sellAmount}
                        onChange={(e) => setSellAmount(e.target.value)}
                        placeholder={MARKETPLACE_MIN_LISTING.toLocaleString()}
                        className="w-full rounded-lg bg-ura-panel border border-ura-border/75 px-4 py-3 text-white mb-3"
                      />
                      <label className="block text-gray-400 text-sm mb-2">Price (TON per 1000 PEARLS)</label>
                      <input
                        type="number"
                        min={0.0001}
                        step={0.0001}
                        value={sellPriceTon}
                        onChange={(e) => setSellPriceTon(e.target.value)}
                        placeholder="0.001"
                        className="w-full rounded-lg bg-ura-panel border border-ura-border/75 px-4 py-3 text-white mb-3"
                      />
                      <p className="text-gray-400 text-xs mb-3">Min {MARKETPLACE_MIN_LISTING.toLocaleString()} PEARLS. You receive TON to your connected wallet.</p>
                      <button
                        onClick={handleCreateListing}
                        disabled={isCreating || !tonWalletAddress || !sellAmount || !sellPriceTon || Number(sellAmount) < MARKETPLACE_MIN_LISTING || Number(sellPriceTon) <= 0}
                        className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-[#f3ba2f] text-black font-bold disabled:opacity-50"
                      >
                        {isCreating ? 'Creating...' : 'List for TON'}
                      </button>
                    </div>
                  </>
                )}

                {tab === 'activity' && (
                  <>
                    <h2 className="text-lg font-semibold text-white mb-2">My listings</h2>
                    {isLoadingMe ? (
                      <p className="text-gray-400 py-4">Loading...</p>
                    ) : myListings.length === 0 ? (
                      <p className="text-gray-400 text-sm py-4">No listings.</p>
                    ) : (
                      <div className="space-y-2 mb-6">
                        {myListings.map((l) => (
                          <div key={l.id} className="flex items-center justify-between p-3 rounded-xl bg-ura-panel-2 border border-ura-border/75">
                            <div>
                              <span className="text-[#f3ba2f] font-semibold">{formatNumber(l.remainingAmount)}</span>
                              <span className="text-gray-400 text-sm"> / {formatNumber(l.amount)} PEARLS</span>
                              <span className="ml-2 text-xs text-gray-500">{l.status}</span>
                            </div>
                            {l.status === 'active' && l.remainingAmount > 0 && (
                              <button
                                onClick={() => handleCancelListing(l.id)}
                                className="py-1.5 px-3 rounded-lg bg-rose-500/20 text-rose-400 text-sm"
                              >
                                Cancel
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    <h2 className="text-lg font-semibold text-white mb-2">My purchases</h2>
                    {myTrades.length === 0 ? (
                      <p className="text-gray-400 text-sm py-4">No purchases yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {myTrades.map((t) => (
                          <div key={t.id} className="p-3 rounded-xl bg-ura-panel-2 border border-ura-border/75">
                            <span className="text-emerald-400 font-semibold">+{formatNumber(t.amount)} PEARLS</span>
                            <span className="text-gray-400 text-sm"> (paid {t.currency === 'ton' ? `${Number(t.amountPaid).toFixed(4)} TON` : `${formatNumber(t.amountPaid)} PEARLS`})</span>
                            <p className="text-gray-500 text-xs mt-1">{new Date(t.createdAt).toLocaleString()}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
  );
}
