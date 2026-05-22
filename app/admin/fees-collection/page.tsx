'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useToast } from '@/contexts/ToastContext';
import { formatNumber } from '@/utils/ui';

interface FeeRecipient {
  telegramId: string;
  name: string;
  pointsBalance: number;
}

type TransactionType = 'transfer_fee' | 'donation' | 'multitap' | 'mine' | 'energy_limit' | 'league_commitment' | 'team_commitment';

type TabId = 'fees' | 'donations' | 'upgrades';

const TABS: { id: TabId; label: string; types: TransactionType[] }[] = [
  { id: 'fees', label: 'Fees', types: ['transfer_fee'] },
  { id: 'donations', label: 'Donations', types: ['donation'] },
  { id: 'upgrades', label: 'Upgrades', types: ['multitap', 'mine', 'energy_limit', 'league_commitment', 'team_commitment'] },
];

interface Transaction {
  id: string;
  amount: number;
  senderName: string;
  senderTelegramId: string;
  createdAt: string;
  type: TransactionType;
}

interface DateSummary {
  date: string;
  count: number;
  amount: number;
}

interface FeesData {
  feeRecipient: FeeRecipient;
  transactions: Transaction[];
  totalAmount: number;
  totalCount: number;
  byDate: DateSummary[];
}

export default function AdminFeesCollection() {
  const showToast = useToast();
  const [data, setData] = useState<FeesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [sectionPasswordRequired, setSectionPasswordRequired] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('fees');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setSectionPasswordRequired(false);
    try {
      const res = await fetch('/api/admin/fees-collection', { credentials: 'include' });
      const err = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 403 && (err as { code?: string }).code === 'ITEM_REQUIRED') {
          setSectionPasswordRequired(true);
          setData(null);
          return;
        }
        throw new Error((err as { error?: string }).error || 'Failed to load');
      }
      setData(err);
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to load fees data', 'error');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="min-h-screen bg-ura-panel text-white p-8">
        <div className="max-w-5xl mx-auto">
          <Link href="/admin" className="text-[#f3ba2f] mb-4 inline-block">← Back to Admin</Link>
          <p className="text-gray-400">Loading fees collection data...</p>
        </div>
      </div>
    );
  }

  if (sectionPasswordRequired) {
    return (
      <div className="min-h-screen bg-ura-panel text-white p-8">
        <div className="max-w-5xl mx-auto">
          <Link href="/admin" className="text-[#f3ba2f] mb-4 inline-block">← Back to Admin</Link>
          <p className="text-amber-400 mb-2">Section password required.</p>
          <p className="text-gray-400 text-sm">Go back to Admin and open Fees Collection again to enter the section password.</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-ura-panel text-white p-8">
        <div className="max-w-5xl mx-auto">
          <Link href="/admin" className="text-[#f3ba2f] mb-4 inline-block">← Back to Admin</Link>
          <p className="text-red-400">Failed to load data.</p>
        </div>
      </div>
    );
  }

  const { feeRecipient, transactions, totalAmount, totalCount } = data;

  const getTabTransactions = (tabId: TabId) => {
    const types = TABS.find((t) => t.id === tabId)?.types ?? [];
    return transactions.filter((t) => types.includes(t.type));
  };

  const getTabByDate = (tabId: TabId) => {
    const tabTxns = getTabTransactions(tabId);
    const byDateMap: Record<string, { count: number; amount: number }> = {};
    for (const t of tabTxns) {
      const dateKey = t.createdAt.slice(0, 10);
      if (!byDateMap[dateKey]) byDateMap[dateKey] = { count: 0, amount: 0 };
      byDateMap[dateKey].count += 1;
      byDateMap[dateKey].amount += t.amount;
    }
    return Object.keys(byDateMap)
      .sort((a, b) => b.localeCompare(a))
      .map((date) => ({ date, count: byDateMap[date].count, amount: byDateMap[date].amount }));
  };

  const tabTransactions = getTabTransactions(activeTab);
  const tabByDate = getTabByDate(activeTab);
  const tabAmount = tabTransactions.reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="min-h-screen bg-ura-panel text-white p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <Link href="/admin" className="text-[#f3ba2f] mb-2 inline-block">← Back to Admin</Link>
            <h1 className="text-3xl font-bold text-[#f3ba2f]">Fees Collection Panel</h1>
          <p className="text-gray-400 text-sm mt-1">
            Wallet: {feeRecipient.name} (Telegram ID: {feeRecipient.telegramId}). View by tab: Fees, Donations, Upgrades.
          </p>
          <p className="mt-2 max-w-2xl text-xs leading-relaxed text-gray-500">
            This ledger is in-game / Telegram PEARLS (fees, donations, upgrades). School tuition checkout — programme fee
            lines, semester vs full-year coverage, per-line selection, and checkout processing UGX — is managed in the
            Tuition Hub from the main admin dashboard, not on this screen.
          </p>
          </div>
          <button
            type="button"
            onClick={fetchData}
            className="px-4 py-2 bg-ura-panel-2 hover:bg-[#3a3d42] rounded-lg text-sm"
          >
            Refresh
          </button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-ura-panel-2 rounded-xl p-5">
            <p className="text-gray-400 text-sm">Current wallet balance</p>
            <p className="text-2xl font-bold text-[#f3ba2f]">{formatNumber(feeRecipient.pointsBalance)} PEARLS</p>
          </div>
          <div className="bg-ura-panel-2 rounded-xl p-5">
            <p className="text-gray-400 text-sm">Total received (fees + donations + upgrades)</p>
            <p className="text-2xl font-bold text-white">{formatNumber(totalAmount)} PEARLS</p>
          </div>
          <div className="bg-ura-panel-2 rounded-xl p-5">
            <p className="text-gray-400 text-sm">Number of transactions</p>
            <p className="text-2xl font-bold text-white">{totalCount}</p>
          </div>
        </div>

        {/* Tabs: Fees | Donations | Upgrades */}
        <div className="flex gap-1 p-1 rounded-xl bg-ura-panel-2 border border-ura-border/75 mb-6">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-colors ${
                activeTab === tab.id
                  ? 'bg-ura-gold text-black'
                  : 'text-gray-400 hover:text-white hover:bg-[#3d4046]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab summary */}
        <div className="bg-ura-panel-2 rounded-xl p-5 mb-6">
          <p className="text-gray-400 text-sm">
            {TABS.find((t) => t.id === activeTab)?.label} — {tabTransactions.length} transaction{tabTransactions.length !== 1 ? 's' : ''}, {formatNumber(tabAmount)} PEARLS
          </p>
        </div>

        {/* By date (for active tab) */}
        <div className="bg-ura-panel-2 rounded-xl p-6 mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">By date ({TABS.find((t) => t.id === activeTab)?.label})</h2>
          {tabByDate.length === 0 ? (
            <p className="text-gray-400">No transactions in this category yet.</p>
          ) : (
            <>
            <ul className="space-y-2 md:hidden">
              {tabByDate.map((row) => (
                <li
                  key={row.date}
                  className="flex items-center justify-between rounded-lg border border-ura-border/75 bg-ura-panel/40 px-4 py-3 text-sm"
                >
                  <span className="text-white">{row.date}</span>
                  <span className="text-gray-400">{row.count} tx</span>
                  <span className="font-medium text-[#f3ba2f]">{formatNumber(row.amount)}</span>
                </li>
              ))}
            </ul>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-ura-border/75">
                    <th className="pb-3 pr-4 text-gray-400 font-medium">Date</th>
                    <th className="pb-3 pr-4 text-gray-400 font-medium text-right">Count</th>
                    <th className="pb-3 text-gray-400 font-medium text-right">Amount (PEARLS)</th>
                  </tr>
                </thead>
                <tbody>
                  {tabByDate.map((row) => (
                    <tr key={row.date} className="border-b border-ura-border/75/50">
                      <td className="py-3 pr-4 text-white">{row.date}</td>
                      <td className="py-3 pr-4 text-right text-white">{row.count}</td>
                      <td className="py-3 text-right text-[#f3ba2f] font-medium">{formatNumber(row.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </>
          )}
        </div>

        {/* Transactions list (active tab only) */}
        <div className="bg-ura-panel-2 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-white mb-4">{TABS.find((t) => t.id === activeTab)?.label} (newest first)</h2>
          {tabTransactions.length === 0 ? (
            <p className="text-gray-400">No transactions in this category yet.</p>
          ) : (
            <>
            <ul className="max-h-[500px] space-y-2 overflow-y-auto md:hidden">
              {tabTransactions.map((t) => (
                <li
                  key={t.id}
                  className="rounded-lg border border-ura-border/75 bg-ura-panel/40 p-4 text-sm"
                >
                  <p className="text-gray-300">{new Date(t.createdAt).toLocaleString()}</p>
                  <p className="mt-1 font-medium text-white">{t.senderName}</p>
                  <p className="font-mono text-xs text-gray-400">{t.senderTelegramId}</p>
                  <p className="mt-2 text-right font-medium text-[#f3ba2f]">{formatNumber(t.amount)} PEARLS</p>
                </li>
              ))}
            </ul>
            <div className="hidden max-h-[500px] overflow-x-auto overflow-y-auto md:block">
              <table className="w-full text-left">
                <thead className="sticky top-0 bg-ura-panel-2 z-10">
                  <tr className="border-b border-ura-border/75">
                    <th className="pb-3 pr-4 text-gray-400 font-medium">Date & time</th>
                    <th className="pb-3 pr-4 text-gray-400 font-medium">Type</th>
                    <th className="pb-3 pr-4 text-gray-400 font-medium">From</th>
                    <th className="pb-3 pr-4 text-gray-400 font-medium">Telegram ID</th>
                    <th className="pb-3 text-gray-400 font-medium text-right">Amount (PEARLS)</th>
                  </tr>
                </thead>
                <tbody>
                  {tabTransactions.map((t) => (
                    <tr key={t.id} className="border-b border-ura-border/75/50">
                      <td className="py-2 pr-4 text-gray-300 text-sm">
                        {new Date(t.createdAt).toLocaleString()}
                      </td>
                      <td className="py-2 pr-4">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          t.type === 'transfer_fee' ? 'bg-blue-500/20 text-blue-300' :
                          t.type === 'donation' ? 'bg-teal-500/20 text-teal-300' :
                          t.type === 'multitap' ? 'bg-amber-500/20 text-amber-300' :
                          t.type === 'mine' ? 'bg-emerald-500/20 text-emerald-300' :
                          t.type === 'league_commitment' ? 'bg-violet-500/20 text-violet-300' :
                          t.type === 'team_commitment' ? 'bg-indigo-500/20 text-indigo-300' :
                          'bg-purple-500/20 text-purple-300'
                        }`}>
                          {t.type === 'transfer_fee' ? 'Transfer fee' : t.type === 'donation' ? 'Donation' : t.type === 'energy_limit' ? 'Energy limit' : t.type === 'league_commitment' ? 'League commitment' : t.type === 'team_commitment' ? 'Team commitment' : t.type.charAt(0).toUpperCase() + t.type.slice(1)}
                        </span>
                      </td>
                      <td className="py-2 pr-4 text-white">{t.senderName}</td>
                      <td className="py-2 pr-4 text-gray-400 font-mono text-sm">{t.senderTelegramId}</td>
                      <td className="py-2 text-right text-[#f3ba2f] font-medium">{formatNumber(t.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </>
          )}
        </div>

        <p className="text-gray-500 text-sm mt-4">
          Types: <strong>transfer_fee</strong> = P2P send fee; <strong>donation</strong> = charity donation; <strong>multitap</strong> / <strong>mine</strong> / <strong>energy limit</strong> = upgrade payment; <strong>team_commitment</strong> = team creation (1M PEARLS); <strong>league_commitment</strong> = league creation (10M PEARLS).
        </p>
      </div>
    </div>
  );
}
