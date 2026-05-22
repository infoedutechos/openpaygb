'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { triggerHapticFeedback } from '@/utils/ui';

type PendingBlueActivity = {
  id: string;
  sourceKey: string;
  sourceLabel: string;
  amount: number;
  status?: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  approvedAt?: string | null;
  rejectionReason?: string | null;
  user: { telegramId: string; name: string | null };
};

type PendingWithdrawal = {
  id: string;
  goldishAmount: number;
  cashAmount: number | null;
  createdAt: string;
  user: { telegramId: string; name: string | null };
};

type AccountsSummary = {
  totalUsers: number;
  totalPoints: number;
  frozenCount: number;
  hiddenCount: number;
};

export default function AdminPearlsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totals, setTotals] = useState({ white: 0, bluePending: 0, blueApproved: 0, goldish: 0 });
  const [accountsSummary, setAccountsSummary] = useState<AccountsSummary>({ totalUsers: 0, totalPoints: 0, frozenCount: 0, hiddenCount: 0 });
  const [pendingBlueActivities, setPendingBlueActivities] = useState<PendingBlueActivity[]>([]);
  const [receiptRushActivities, setReceiptRushActivities] = useState<PendingBlueActivity[]>([]);
  const [pendingWithdrawals, setPendingWithdrawals] = useState<PendingWithdrawal[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [pearlsRes, accountsRes] = await Promise.all([
        fetch('/api/admin/pearls'),
        fetch('/api/admin/accounts?page=1&limit=1'),
      ]);
      const pearlsData = await pearlsRes.json();
      const accountsData = await accountsRes.json();
      if (!pearlsRes.ok) throw new Error(pearlsData.error || 'Failed to load pearls admin data');
      setTotals(pearlsData.totals || { white: 0, bluePending: 0, blueApproved: 0, goldish: 0 });
      setPendingBlueActivities(pearlsData.pendingBlueActivities || []);
      setReceiptRushActivities(pearlsData.receiptRushActivities || []);
      setPendingWithdrawals(pearlsData.pendingWithdrawals || []);
      if (accountsRes.ok && accountsData?.summary) {
        setAccountsSummary({
          totalUsers: Number(accountsData.summary.totalUsers ?? 0),
          totalPoints: Number(accountsData.summary.totalPoints ?? 0),
          frozenCount: Number(accountsData.summary.frozenCount ?? 0),
          hiddenCount: Number(accountsData.summary.hiddenCount ?? 0),
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load pearls admin data');
    } finally {
      setLoading(false);
    }
  }, []);

  const formatNumber = (num: number): string => {
    if (num >= 1e12) return (num / 1e12).toFixed(1) + 'T';
    if (num >= 1e9) return (num / 1e9).toFixed(1) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
    return Math.floor(num).toString();
  };

  useEffect(() => {
    loadData();
  }, [loadData]);

  const runAction = async (payload: Record<string, unknown>) => {
    triggerHapticFeedback(window);
    const res = await fetch('/api/admin/pearls', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Action failed');
    await loadData();
  };

  const parseReceiptRushLabel = (sourceLabel: string): Record<string, string> => {
    const out: Record<string, string> = {};
    const parts = sourceLabel.split(' · ').map((p) => p.trim()).filter(Boolean);
    for (const part of parts) {
      const idx = part.indexOf(':');
      if (idx > 0) {
        out[part.slice(0, idx).trim()] = part.slice(idx + 1).trim();
      }
    }
    return out;
  };

  const statusBadgeClass = (status?: string): string => {
    if (status === 'APPROVED') return 'border-emerald-500/45 bg-emerald-500/10 text-emerald-300';
    if (status === 'REJECTED') return 'border-rose-500/45 bg-rose-500/10 text-rose-300';
    return 'border-amber-500/45 bg-amber-500/10 text-amber-300';
  };

  return (
    <div className="min-h-screen bg-ura-panel text-white p-6 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-[#f3ba2f]">Pearls Management</h1>
            <p className="text-sm text-gray-400 mt-1">
              White (no approval), Blue (approval required), Goldish (approved and withdrawable).
            </p>
          </div>
          <Link
            href="/admin"
            className="inline-flex items-center rounded-lg bg-ura-panel-2 px-4 py-2 text-sm hover:bg-[#3a3d42] transition-colors"
          >
            Back to Admin
          </Link>
        </div>

        {loading ? <p className="text-gray-400 mb-4">Loading pearls data...</p> : null}
        {error ? <p className="text-rose-400 mb-4">{error}</p> : null}

        {!loading && !error ? (
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-ura-border/85 bg-ura-panel-2 px-4 py-3 text-center">
              <p className="text-xs uppercase tracking-wide text-gray-500">White</p>
              <p className="text-lg font-semibold text-white tabular-nums">{formatNumber(totals.white)}</p>
            </div>
            <div className="rounded-xl border border-ura-border/85 bg-ura-panel-2 px-4 py-3 text-center">
              <p className="text-xs uppercase tracking-wide text-gray-500">Blue pending</p>
              <p className="text-lg font-semibold text-sky-200 tabular-nums">{formatNumber(totals.bluePending)}</p>
            </div>
            <div className="rounded-xl border border-ura-border/85 bg-ura-panel-2 px-4 py-3 text-center">
              <p className="text-xs uppercase tracking-wide text-gray-500">Blue approved</p>
              <p className="text-lg font-semibold text-emerald-200 tabular-nums">{formatNumber(totals.blueApproved)}</p>
            </div>
            <div className="rounded-xl border border-ura-border/85 bg-ura-panel-2 px-4 py-3 text-center">
              <p className="text-xs uppercase tracking-wide text-gray-500">Goldish</p>
              <p className="text-lg font-semibold text-[#f3ba2f] tabular-nums">{formatNumber(totals.goldish)}</p>
            </div>
          </div>
        ) : null}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section className="rounded-xl border border-ura-border/85 bg-ura-panel-2 p-5">
            <h2 className="text-xl font-semibold">Conversion Rules</h2>
            <div className="mt-4 space-y-2">
              <div className="rounded-lg border border-ura-line/80 bg-ura-panel/90 px-3 py-2 text-sm">
                <span className="font-semibold">50</span> White ={' '}
                <span className="font-semibold text-[#f3ba2f]">1 Goldish</span>
              </div>
              <div className="rounded-lg border border-ura-line/80 bg-ura-panel/90 px-3 py-2 text-sm">
                <span className="font-semibold">25</span> Blue ={' '}
                <span className="font-semibold text-[#f3ba2f]">1 Goldish</span> (after admin approval)
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-4">
              Blue pearls are automatically converted only after admin approval. Goldish can be converted back to White.
            </p>
          </section>

          <section className="rounded-xl border border-ura-border/85 bg-ura-panel-2 p-5">
            <h2 className="text-xl font-semibold">Required Histories</h2>
            <ul className="mt-4 space-y-2 text-sm text-gray-300">
              <li>White pearls accumulated and converted to Goldish.</li>
              <li>Blue pearls accumulated and approval outcomes.</li>
              <li>Goldish withdrawals and withdrawal status.</li>
              <li>White and Goldish transfers between users.</li>
              <li>Goldish to White reverse conversions.</li>
            </ul>
          </section>
        </div>

        <section id="receipt-rush-uploads" className="mt-6 rounded-xl border border-cyan-700/45 bg-cyan-950/15 p-5 scroll-mt-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-cyan-200">Receipt Rush Uploads</h2>
              <p className="text-sm text-gray-400 mt-1">
                Uploaded/scanned receipts with uploader details. Pending rows can be approved or rejected here.
              </p>
            </div>
            <span className="rounded-full border border-cyan-500/40 bg-cyan-500/10 px-3 py-1 text-xs text-cyan-200">
              {receiptRushActivities.length} total
            </span>
          </div>
          <div className="mt-4 space-y-2">
            {receiptRushActivities.length === 0 ? (
              <p className="text-sm text-gray-400 rounded-lg border border-dashed border-cyan-700/35 p-3">
                No Receipt Rush uploads yet. Once a user submits a receipt, it will appear here.
              </p>
            ) : (
              receiptRushActivities.map((item) => {
                  const parsed = parseReceiptRushLabel(item.sourceLabel);
                  const imageRef = parsed.Image || null;
                  const receiptUrl =
                    imageRef && imageRef !== 'embedded'
                      ? imageRef
                      : imageRef === 'embedded'
                        ? `/api/admin/receipt-rush-image/${item.id}`
                        : null;
                  return (
                    <div key={`receipt-${item.id}`} className="rounded-lg border border-ura-line/80 bg-ura-panel/90 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-white">
                            {item.user.name || 'User'} ({item.user.telegramId})
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            Submitted: {new Date(item.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className={`text-xs rounded-full px-2 py-1 border ${statusBadgeClass(item.status)}`}>
                            {(item.status || 'PENDING').toLowerCase()}
                          </span>
                          <span className="text-xs rounded-full px-2 py-1 bg-[#5fa8ff]/15 border border-[#5fa8ff]/40 text-[#9dc9ff]">
                            {Math.floor(item.amount)} Blue
                          </span>
                        </div>
                      </div>
                      <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-gray-300">
                        <p><span className="text-gray-400">Category:</span> {parsed['Receipt Rush'] || parsed['Category'] || 'N/A'}</p>
                        <p><span className="text-gray-400">Tax type:</span> {parsed['Tax'] || parsed['Tax type'] || 'N/A'}</p>
                        <p><span className="text-gray-400">Portal:</span> {parsed['Portal'] || 'N/A'}</p>
                        <p><span className="text-gray-400">Receipt #:</span> {parsed['Ref'] || 'N/A'}</p>
                        <p><span className="text-gray-400">Date:</span> {parsed['Date'] || 'N/A'}</p>
                        <p><span className="text-gray-400">Paid amount:</span> {parsed['Paid'] || 'N/A'}</p>
                      </div>
                      {receiptUrl ? (
                        <a
                          href={receiptUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 inline-flex text-xs text-cyan-300 underline underline-offset-2"
                        >
                          Open uploaded/scanned receipt
                        </a>
                      ) : null}
                      {item.status === 'REJECTED' && item.rejectionReason ? (
                        <p className="mt-2 text-xs text-rose-300">Rejected reason: {item.rejectionReason}</p>
                      ) : null}
                      {item.status === 'PENDING' ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => runAction({ action: 'approve_blue_activity', activityId: item.id, adminLabel: 'admin_panel' })}
                            className="px-3 py-1.5 text-xs rounded bg-emerald-600 hover:bg-emerald-500"
                          >
                            Approve + Auto Convert
                          </button>
                          <button
                            type="button"
                            onClick={() => runAction({ action: 'reject_blue_activity', activityId: item.id, rejectionReason: 'Receipt not approved', adminLabel: 'admin_panel' })}
                            className="px-3 py-1.5 text-xs rounded bg-rose-700 hover:bg-rose-600"
                          >
                            Reject
                          </button>
                        </div>
                      ) : null}
                    </div>
                  );
                })
            )}
          </div>
        </section>

        <section className="mt-6 rounded-xl border border-ura-border/85 bg-ura-panel-2 p-5">
          <h2 className="text-xl font-semibold">Blue Approval Queue</h2>
          <div className="mt-3 space-y-2">
            {pendingBlueActivities.length === 0 ? (
              <p className="text-sm text-gray-400">No pending blue-pearl activities.</p>
            ) : (
              pendingBlueActivities.map((item) => (
                <div key={item.id} className="rounded-lg border border-ura-line/80 bg-ura-panel/90 p-3">
                  <p className="font-medium text-white">{item.sourceLabel}</p>
                  {item.sourceKey === 'receipt_rush' && item.sourceLabel.includes('/uploads/receipts/') ? (
                    <a
                      href={item.sourceLabel.slice(item.sourceLabel.indexOf('/uploads/receipts/')).split(' · ')[0]}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 inline-flex text-xs text-cyan-300 underline underline-offset-2"
                    >
                      Open uploaded receipt
                    </a>
                  ) : null}
                  <p className="text-xs text-gray-400 mt-1">
                    {item.user.name || 'User'} ({item.user.telegramId}) · {Math.floor(item.amount)} Blue
                  </p>
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => runAction({ action: 'approve_blue_activity', activityId: item.id, adminLabel: 'admin_panel' })}
                      className="px-3 py-1.5 text-xs rounded bg-emerald-600 hover:bg-emerald-500"
                    >
                      Approve + Auto Convert
                    </button>
                    <button
                      type="button"
                      onClick={() => runAction({ action: 'reject_blue_activity', activityId: item.id, rejectionReason: 'Not approved', adminLabel: 'admin_panel' })}
                      className="px-3 py-1.5 text-xs rounded bg-rose-700 hover:bg-rose-600"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="mt-6 rounded-xl border border-ura-border/85 bg-ura-panel-2 p-5">
          <h2 className="text-xl font-semibold">Withdrawal Queue</h2>
          <div className="mt-3 space-y-2">
            {pendingWithdrawals.length === 0 ? (
              <p className="text-sm text-gray-400">No pending withdrawals.</p>
            ) : (
              pendingWithdrawals.map((item) => (
                <div key={item.id} className="rounded-lg border border-ura-line/80 bg-ura-panel/90 p-3">
                  <p className="font-medium text-white">{item.user.name || 'User'} ({item.user.telegramId})</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {Math.floor(item.goldishAmount)} Goldish {item.cashAmount ? `· Cash ${item.cashAmount}` : ''}
                  </p>
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => runAction({ action: 'approve_withdrawal', withdrawalId: item.id, adminLabel: 'admin_panel' })}
                      className="px-3 py-1.5 text-xs rounded bg-emerald-600 hover:bg-emerald-500"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => runAction({ action: 'mark_withdrawal_paid', withdrawalId: item.id, adminLabel: 'admin_panel' })}
                      className="px-3 py-1.5 text-xs rounded bg-sky-700 hover:bg-sky-600"
                    >
                      Mark Paid
                    </button>
                    <button
                      type="button"
                      onClick={() => runAction({ action: 'reject_withdrawal', withdrawalId: item.id, reason: 'Rejected by admin', adminLabel: 'admin_panel' })}
                      className="px-3 py-1.5 text-xs rounded bg-rose-700 hover:bg-rose-600"
                    >
                      Reject + Refund
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="mt-6 rounded-xl border border-ura-border/85 bg-ura-panel-2 p-5">
          <h2 className="text-xl font-semibold">Account Management</h2>
          <p className="text-sm text-gray-400 mt-1">
            Pearls Overview now includes quick account tools. Use full management for table actions.
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
            <div className="rounded-lg border border-ura-line/80 bg-ura-panel/90 p-3">
              <p className="text-xs text-gray-400 uppercase">Total Users</p>
              <p className="text-xl font-bold">{formatNumber(accountsSummary.totalUsers)}</p>
            </div>
            <div className="rounded-lg border border-ura-line/80 bg-ura-panel/90 p-3">
              <p className="text-xs text-gray-400 uppercase">Total Points</p>
              <p className="text-xl font-bold text-[#f3ba2f]">{formatNumber(accountsSummary.totalPoints)}</p>
            </div>
            <div className="rounded-lg border border-ura-line/80 bg-ura-panel/90 p-3">
              <p className="text-xs text-gray-400 uppercase">Frozen Accounts</p>
              <p className="text-xl font-bold text-rose-400">{accountsSummary.frozenCount}</p>
            </div>
            <div className="rounded-lg border border-ura-line/80 bg-ura-panel/90 p-3">
              <p className="text-xs text-gray-400 uppercase">Hidden Accounts</p>
              <p className="text-xl font-bold">{accountsSummary.hiddenCount}</p>
            </div>
          </div>

          <div className="mt-4 rounded-lg border border-rose-700/40 bg-rose-950/20 p-3">
            <p className="text-sm font-semibold text-rose-300">⚠️ Bulk Actions (All Users) - Testing Only</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button type="button" onClick={() => runAction({ action: 'freeze_all', allUsers: true })} className="px-3 py-1.5 text-xs rounded bg-orange-700 hover:bg-orange-600">Freeze All</button>
              <button type="button" onClick={() => runAction({ action: 'unfreeze_all', allUsers: true })} className="px-3 py-1.5 text-xs rounded bg-emerald-700 hover:bg-emerald-600">Unfreeze All</button>
              <button type="button" onClick={() => runAction({ action: 'hide_all', allUsers: true })} className="px-3 py-1.5 text-xs rounded bg-slate-700 hover:bg-slate-600">Hide All</button>
              <button type="button" onClick={() => runAction({ action: 'unhide_all', allUsers: true })} className="px-3 py-1.5 text-xs rounded bg-blue-700 hover:bg-blue-600">Unhide All</button>
              <button type="button" onClick={() => runAction({ action: 'reset_all', allUsers: true })} className="px-3 py-1.5 text-xs rounded bg-rose-700 hover:bg-rose-600">Reset All Points & Activities</button>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <Link href="/admin/accounts" className="rounded-lg border border-ura-line/80 bg-ura-panel/90 p-3 hover:bg-ura-panel transition-colors">
              Open full Account Management (search, selected-user actions, delete selected, table)
            </Link>
            <Link href="/admin/export" className="rounded-lg border border-ura-line/80 bg-ura-panel/90 p-3 hover:bg-ura-panel transition-colors">
              Open Export Data (JSON/CSV scope tools)
            </Link>
          </div>
        </section>

        <section className="mt-6 rounded-xl border border-ura-border/85 bg-ura-panel-2 p-5">
          <h2 className="text-xl font-semibold">Admin Operations Checklist</h2>
          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg border border-ura-line/80 bg-ura-panel/90 p-3">
              Approve or reject Blue-pearl activities.
            </div>
            <div className="rounded-lg border border-ura-line/80 bg-ura-panel/90 p-3">
              Auto-convert approved Blue/White pearls to Goldish by configured ratios.
            </div>
            <div className="rounded-lg border border-ura-line/80 bg-ura-panel/90 p-3">
              Validate transfer and withdrawal requests.
            </div>
            <div className="rounded-lg border border-ura-line/80 bg-ura-panel/90 p-3">
              Keep complete audit history for all pearl lifecycle events.
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
