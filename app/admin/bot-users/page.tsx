// app/admin/bot-users/page.tsx

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface BotUser {
  id: string;
  telegramId: string;
  name: string;
  points: number;
  pointsBalance: number;
  totalTaps?: number;
  isFrozen: boolean;
  suspensionReason: string | null;
  flaggedAsBot: boolean;
  botSuspicionCount: number;
  createdAt: string;
  activities?: {
    tasks: number;
    referrals: number;
    dailyCiphers: number;
    dailyCombos: number;
    cards: number;
    stakes: number;
    miniGames: number;
  };
}

const DEFAULT_CHEATING_MESSAGE = 'Cheating is bad. Your account has been suspended.';

export default function BotUsersAdminPage() {
  const [users, setUsers] = useState<BotUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [suspensionMessage, setSuspensionMessage] = useState(DEFAULT_CHEATING_MESSAGE);
  const [confirmAction, setConfirmAction] = useState<{
    action: string;
    label: string;
    payload?: { suspensionMessage?: string };
  } | null>(null);
  const [viewAll, setViewAll] = useState(false);
  const [search, setSearch] = useState('');
  const [detailUserId, setDetailUserId] = useState<string | null>(null);
  const [detailData, setDetailData] = useState<{
    user: Record<string, unknown>;
    receivedTransfers: Array<{ id: string; amount: number; createdAt: string; from: { id: string; telegramId: string; name: string } | null }>;
    sentTransfers: Array<{ id: string; amount: number; createdAt: string; to: { id: string; telegramId: string; name: string } | null }>;
  } | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [weeklyTop, setWeeklyTop] = useState<Array<{
    rank: number;
    weekKey: string;
    weekly: { taps: number; tasksCompleted: number; pointsEarned: number };
    user: { id: string; telegramId: string; name: string; points: number; totalTaps: number; createdAt: string; activities: Record<string, number> };
    receivedPoints: number;
    receivedCount: number;
    sentPoints: number;
    sentCount: number;
  }>>([]);
  const [weeklyTopLoading, setWeeklyTopLoading] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: '50' });
      if (viewAll) params.set('view', 'all');
      if (search.trim()) params.set('search', search.trim());
      const res = await fetch(`/api/admin/bot-users?${params}`, { credentials: 'include', cache: 'no-store' });
      const data = await res.json();

      if (!res.ok) {
        if (res.status === 403 && (data as { code?: string }).code === 'ITEM_REQUIRED') {
          setMessage({ type: 'error', text: 'Section password required. Go back to Admin and open Bot Users again.' });
          setUsers([]);
          return;
        }
        setMessage({ type: 'error', text: 'Failed to fetch bot users' });
        setUsers([]);
        return;
      }
      setUsers(data.users || []);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (error) {
      console.error('Failed to fetch bot users:', error);
      setMessage({ type: 'error', text: 'Failed to fetch bot users' });
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [page, viewAll, search]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    if (!detailUserId) {
      setDetailData(null);
      return;
    }
    setDetailLoading(true);
    fetch(`/api/admin/bot-users/${detailUserId}`, { credentials: 'include', cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        if (data.user) setDetailData({ user: data.user, receivedTransfers: data.receivedTransfers || [], sentTransfers: data.sentTransfers || [] });
        else setDetailData(null);
      })
      .catch(() => setDetailData(null))
      .finally(() => setDetailLoading(false));
  }, [detailUserId]);

  useEffect(() => {
    setWeeklyTopLoading(true);
    fetch('/api/admin/bot-users/weekly-top', { credentials: 'include', cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => setWeeklyTop(Array.isArray(data.list) ? data.list : []))
      .catch(() => setWeeklyTop([]))
      .finally(() => setWeeklyTopLoading(false));
  }, []);

  const handleAction = async (action: string, payload?: { suspensionMessage?: string }) => {
    setActionLoading(true);
    setConfirmAction(null);
    try {
      const body: Record<string, unknown> = { action, userIds: Array.from(selectedUsers) };
      if (action === 'freeze_cheating' && payload?.suspensionMessage != null) {
        body.suspensionMessage = payload.suspensionMessage;
      }

      const res = await fetch('/api/admin/bot-users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        credentials: 'include',
      });

      const data = await res.json();

      if (res.ok) {
        setMessage({ type: 'success', text: data.message || 'Action completed' });
        setSelectedUsers(new Set());
        fetchUsers();
      } else {
        setMessage({ type: 'error', text: data.error || 'Action failed' });
      }
    } catch (error) {
      console.error('Action failed:', error);
      setMessage({ type: 'error', text: 'Action failed' });
    } finally {
      setActionLoading(false);
    }
  };

  const toggleSelectUser = (id: string) => {
    const newSet = new Set(selectedUsers);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedUsers(newSet);
  };

  const toggleSelectAll = () => {
    if (selectedUsers.size === users.length) setSelectedUsers(new Set());
    else setSelectedUsers(new Set(users.map((u) => u.id)));
  };

  const formatNumber = (num: number): string => {
    if (num >= 1e12) return (num / 1e12).toFixed(1) + 'T';
    if (num >= 1e9) return (num / 1e9).toFixed(1) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
    return num.toString();
  };

  return (
    <div className="min-h-screen bg-ura-panel text-white p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link href="/admin" className="text-[#f3ba2f] hover:underline mb-2 inline-block">
              ← Back to Admin
            </Link>
            <h1 className="text-3xl font-bold text-[#f3ba2f]">Bot Users</h1>
            <p className="text-gray-400 mt-1">
              Flagged bots, frozen accounts with suspension message, and users with high suspicion score (invalid sync attempts). Switch to &quot;All users&quot; to see everyone and their activity breakdown.
            </p>
          </div>
        </div>

        {/* Search individual account */}
        <div className="bg-ura-panel-2 p-4 rounded-lg mb-6">
          <label className="block text-sm font-semibold text-gray-300 mb-2">Search by name or Telegram ID</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (setPage(1), fetchUsers())}
              placeholder="Name or Telegram ID..."
              className="flex-1 bg-ura-panel text-white px-4 py-2 rounded-lg border border-gray-600 focus:border-[#f3ba2f] outline-none"
            />
            <button
              onClick={() => { setPage(1); fetchUsers(); }}
              className="bg-ura-gold text-black px-4 py-2 rounded-lg font-semibold"
            >
              Search
            </button>
          </div>
        </div>

        {/* View toggle: Suspected only vs All users */}
        <div className="bg-ura-panel-2 p-4 rounded-lg mb-6 flex flex-wrap items-center gap-4">
          <span className="text-gray-400 font-medium">Show:</span>
          <button
            onClick={() => { setViewAll(false); setPage(1); }}
            className={`px-4 py-2 rounded-lg font-semibold ${!viewAll ? 'bg-amber-600 text-white' : 'bg-ura-panel text-gray-400 hover:text-white'}`}
          >
            Suspected only
          </button>
          <button
            onClick={() => { setViewAll(true); setPage(1); }}
            className={`px-4 py-2 rounded-lg font-semibold ${viewAll ? 'bg-amber-600 text-white' : 'bg-ura-panel text-gray-400 hover:text-white'}`}
          >
            All users
          </button>
        </div>

        {/* Weekly Challenge Top 20 */}
        <div className="bg-ura-panel-2 rounded-lg overflow-hidden mb-8">
          <h2 className="text-xl font-bold text-[#f3ba2f] p-4 border-b border-gray-700">Weekly Challenge — Top 20</h2>
          {weeklyTopLoading ? (
            <div className="p-8 flex justify-center"><div className="w-8 h-8 border-4 border-[#f3ba2f] border-t-transparent rounded-full animate-spin" /></div>
          ) : (
            <>
            <ul className="divide-y divide-gray-700 md:hidden">
              {weeklyTop.map((row) => (
                <li key={row.user.id} className="space-y-2 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-white">
                        #{row.rank} {row.user.name}
                      </p>
                      <p className="font-mono text-xs text-gray-400">{row.user.telegramId}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setDetailUserId(row.user.id)}
                      className="min-h-[44px] shrink-0 text-sm text-[#f3ba2f] hover:underline"
                    >
                      View
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-gray-500">Weekly pts </span>
                      <span className="font-semibold text-[#f3ba2f]">{formatNumber(row.weekly.pointsEarned)}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Taps </span>
                      <span className="text-gray-300">{formatNumber(row.weekly.taps)}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Received </span>
                      <span className="text-green-400">
                        {formatNumber(row.receivedPoints)} ({row.receivedCount})
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Sent </span>
                      <span className="text-amber-400">
                        {formatNumber(row.sentPoints)} ({row.sentCount})
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead className="bg-ura-panel">
                  <tr>
                    <th className="p-2 text-left">#</th>
                    <th className="p-2 text-left">Name</th>
                    <th className="p-2 text-left font-mono">Telegram ID</th>
                    <th className="p-2 text-right">Weekly pts</th>
                    <th className="p-2 text-right">Weekly taps</th>
                    <th className="p-2 text-center">Tasks</th>
                    <th className="p-2 text-right">Received</th>
                    <th className="p-2 text-right">Sent</th>
                    <th className="p-2 text-left">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {weeklyTop.map((row) => (
                    <tr key={row.user.id} className="hover:bg-[#3a3d42]">
                      <td className="p-2">{row.rank}</td>
                      <td className="p-2 font-semibold">{row.user.name}</td>
                      <td className="p-2 text-gray-400 font-mono">{row.user.telegramId}</td>
                      <td className="p-2 text-right text-[#f3ba2f]">{formatNumber(row.weekly.pointsEarned)}</td>
                      <td className="p-2 text-right">{formatNumber(row.weekly.taps)}</td>
                      <td className="p-2 text-center">{row.user.activities?.tasks ?? 0}</td>
                      <td className="p-2 text-right text-green-400">{formatNumber(row.receivedPoints)} ({row.receivedCount})</td>
                      <td className="p-2 text-right text-amber-400">{formatNumber(row.sentPoints)} ({row.sentCount})</td>
                      <td className="p-2">
                        <button type="button" onClick={() => setDetailUserId(row.user.id)} className="text-[#f3ba2f] hover:underline">View</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </>
          )}
          {!weeklyTopLoading && weeklyTop.length === 0 && <div className="p-6 text-center text-gray-400">No weekly participants yet.</div>}
        </div>

        {message && (
          <div
            className={`p-4 rounded-lg mb-6 ${message.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}
          >
            {message.text}
            <button onClick={() => setMessage(null)} className="float-right font-bold">×</button>
          </div>
        )}

        {/* Custom suspension message */}
        <div className="bg-ura-panel-2 p-4 rounded-lg mb-6">
          <label className="block text-sm font-semibold text-gray-300 mb-2">
            Suspension message (shown on game screen when freezing for cheating)
          </label>
          <input
            type="text"
            value={suspensionMessage}
            onChange={(e) => setSuspensionMessage(e.target.value)}
            placeholder={DEFAULT_CHEATING_MESSAGE}
            className="w-full bg-ura-panel text-white px-4 py-2 rounded-lg border border-gray-600 focus:border-[#f3ba2f] outline-none"
          />
        </div>

        {/* Actions for selected users */}
        <div className="bg-[#252830] border border-amber-900/50 p-4 rounded-lg mb-6">
          <h2 className="text-lg font-semibold mb-3 text-amber-300">Actions for selected users</h2>
          <p className="text-gray-400 text-sm mb-3">Select users in the table below, then choose an action.</p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleAction('flag_as_bot')}
              disabled={actionLoading || selectedUsers.size === 0}
              className="bg-amber-600 hover:bg-amber-700 px-3 py-2 rounded-lg font-semibold disabled:opacity-50"
            >
              Flag as bot
            </button>
            <button
              onClick={() => handleAction('unflag_bot')}
              disabled={actionLoading || selectedUsers.size === 0}
              className="bg-gray-600 hover:bg-gray-700 px-3 py-2 rounded-lg font-semibold disabled:opacity-50"
            >
              Unflag bot
            </button>
            <button
              onClick={() =>
                setConfirmAction({
                  action: 'freeze_cheating',
                  label: 'Freeze with cheating message (account suspended on game screen)',
                  payload: { suspensionMessage },
                })
              }
              disabled={actionLoading || selectedUsers.size === 0}
              className="bg-red-600 hover:bg-red-700 px-3 py-2 rounded-lg font-semibold disabled:opacity-50"
            >
              Freeze (cheating message)
            </button>
            <button
              onClick={() => handleAction('unfreeze')}
              disabled={actionLoading || selectedUsers.size === 0}
              className="bg-green-600 hover:bg-green-700 px-3 py-2 rounded-lg font-semibold disabled:opacity-50"
            >
              Unfreeze
            </button>
            {selectedUsers.size > 0 && (
              <button
                onClick={() => setSelectedUsers(new Set())}
                className="text-gray-400 hover:text-white px-3 py-1"
              >
                Clear selection
              </button>
            )}
          </div>
        </div>

        {/* Confirmation modal */}
        {confirmAction && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-ura-navy/70 p-0 sm:items-center sm:p-4">
            <div className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-ura-panel-2 p-6 sm:rounded-lg">
              <p className="text-lg mb-4">{confirmAction.label}</p>
              {confirmAction.action === 'freeze_cheating' && (
                <p className="text-gray-400 text-sm mb-4">
                  Message: &quot;{confirmAction.payload?.suspensionMessage || suspensionMessage}&quot;
                </p>
              )}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    if (confirmAction.action === 'freeze_cheating') {
                      handleAction(confirmAction.action, {
                        suspensionMessage: confirmAction.payload?.suspensionMessage ?? suspensionMessage,
                      });
                    } else {
                      handleAction(confirmAction.action);
                    }
                    setConfirmAction(null);
                  }}
                  className="flex-1 bg-red-600 hover:bg-red-700 py-2 rounded-lg font-semibold"
                >
                  Confirm
                </button>
                <button
                  onClick={() => setConfirmAction(null)}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 py-2 rounded-lg font-semibold"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="bg-ura-panel-2 rounded-lg overflow-hidden">
          {loading ? (
            <div className="p-8 flex justify-center">
              <div className="w-8 h-8 border-4 border-[#f3ba2f] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
            <ul className="divide-y divide-gray-700 md:hidden">
              {users.map((user) => (
                <li
                  key={user.id}
                  className={`space-y-2 p-4 ${selectedUsers.has(user.id) ? "bg-[#3a3d42]" : ""}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <label className="flex min-h-[44px] flex-1 cursor-pointer items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedUsers.has(user.id)}
                        onChange={() => toggleSelectUser(user.id)}
                        className="h-4 w-4 shrink-0"
                      />
                      <span className="font-semibold text-white">{user.name}</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setDetailUserId(user.id)}
                      className="min-h-[44px] shrink-0 text-sm text-[#f3ba2f] hover:underline"
                    >
                      View
                    </button>
                  </div>
                  <p className="font-mono text-xs text-gray-400">{user.telegramId}</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-gray-500">Points </span>
                      <span className="font-bold text-[#f3ba2f]">{formatNumber(user.points)}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Taps </span>
                      <span className="text-gray-300">
                        {user.totalTaps != null ? formatNumber(user.totalTaps) : "—"}
                      </span>
                    </div>
                    {(user.flaggedAsBot || user.isFrozen || user.botSuspicionCount > 0) && (
                      <div className="col-span-2 flex flex-wrap gap-2">
                        {user.botSuspicionCount > 0 && (
                          <span className="rounded bg-amber-900/40 px-2 py-0.5 text-amber-300">
                            Suspicion {user.botSuspicionCount}
                          </span>
                        )}
                        {user.flaggedAsBot && (
                          <span className="rounded bg-amber-900/40 px-2 py-0.5 text-amber-300">Flagged</span>
                        )}
                        {user.isFrozen && (
                          <span className="rounded bg-red-900/40 px-2 py-0.5 text-red-300">Frozen</span>
                        )}
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full">
                <thead className="bg-ura-panel">
                  <tr>
                    <th className="p-3 text-left">
                      <input
                        type="checkbox"
                        checked={users.length > 0 && selectedUsers.size === users.length}
                        onChange={toggleSelectAll}
                        className="w-4 h-4"
                      />
                    </th>
                    <th className="p-3 text-left">Name</th>
                    <th className="p-3 text-left font-mono text-sm">Telegram ID</th>
                    <th className="p-3 text-right">Points</th>
                    <th className="p-3 text-right">Taps</th>
                    <th className="p-3 text-center" title="Tasks">T</th>
                    <th className="p-3 text-center" title="Referrals">Ref</th>
                    <th className="p-3 text-center" title="Daily Ciphers">DC</th>
                    <th className="p-3 text-center" title="Daily Combos">DCo</th>
                    <th className="p-3 text-center" title="Cards">C</th>
                    <th className="p-3 text-center" title="Stakes">S</th>
                    <th className="p-3 text-center" title="Mini games">MG</th>
                    <th className="p-3 text-center">Suspicion</th>
                    <th className="p-3 text-center">Flagged</th>
                    <th className="p-3 text-center">Frozen</th>
                    <th className="p-3 text-left max-w-xs">Suspension message</th>
                    <th className="p-3 text-left">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {users.map((user) => (
                    <tr
                      key={user.id}
                      className={`hover:bg-[#3a3d42] ${selectedUsers.has(user.id) ? 'bg-[#3a3d42]' : ''}`}
                    >
                      <td className="p-3">
                        <input
                          type="checkbox"
                          checked={selectedUsers.has(user.id)}
                          onChange={() => toggleSelectUser(user.id)}
                          className="w-4 h-4"
                        />
                      </td>
                      <td className="p-3 font-semibold">{user.name}</td>
                      <td className="p-3 text-gray-400 font-mono text-sm">{user.telegramId}</td>
                      <td className="p-3 text-right text-[#f3ba2f] font-bold">{formatNumber(user.points)}</td>
                      <td className="p-3 text-right text-gray-300">{user.totalTaps != null ? formatNumber(user.totalTaps) : '—'}</td>
                      <td className="p-3 text-center text-gray-300">{user.activities?.tasks ?? '—'}</td>
                      <td className="p-3 text-center text-gray-300">{user.activities?.referrals ?? '—'}</td>
                      <td className="p-3 text-center text-gray-300">{user.activities?.dailyCiphers ?? '—'}</td>
                      <td className="p-3 text-center text-gray-300">{user.activities?.dailyCombos ?? '—'}</td>
                      <td className="p-3 text-center text-gray-300">{user.activities?.cards ?? '—'}</td>
                      <td className="p-3 text-center text-gray-300">{user.activities?.stakes ?? '—'}</td>
                      <td className="p-3 text-center text-gray-300">{user.activities?.miniGames ?? '—'}</td>
                      <td className="p-3 text-center">
                        {user.botSuspicionCount > 0 ? (
                          <span className="text-amber-400 font-semibold">{user.botSuspicionCount}</span>
                        ) : (
                          <span className="text-gray-500">0</span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        {user.flaggedAsBot ? (
                          <span className="text-amber-400 font-semibold">Yes</span>
                        ) : (
                          <span className="text-gray-500">No</span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        {user.isFrozen ? (
                          <span className="text-red-400 font-semibold">Yes</span>
                        ) : (
                          <span className="text-gray-500">No</span>
                        )}
                      </td>
                      <td className="p-3 text-gray-400 text-sm max-w-xs truncate" title={user.suspensionReason || ''}>
                        {user.suspensionReason || '—'}
                      </td>
                      <td className="p-3">
                        <button type="button" onClick={() => setDetailUserId(user.id)} className="text-[#f3ba2f] hover:underline">View</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </>
          )}
          {!loading && users.length === 0 && (
            <div className="p-8 text-center text-gray-400">
              {viewAll ? 'No users found.' : 'No suspected or flagged users. Switch to "All users" to see everyone and their activities.'}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-6">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="bg-ura-panel-2 px-4 py-2 rounded-lg disabled:opacity-50"
            >
              Previous
            </button>
            <span className="py-2">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="bg-ura-panel-2 px-4 py-2 rounded-lg disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}

        {/* Per-user detail drawer */}
        {detailUserId && (
          <div className="fixed inset-0 z-50 flex justify-end">
            <div className="absolute inset-0 bg-ura-navy/60" onClick={() => setDetailUserId(null)} aria-hidden />
            <div className="relative w-full max-w-lg bg-ura-panel-2 shadow-xl overflow-y-auto flex flex-col">
              <div className="sticky top-0 bg-ura-panel-2 border-b border-gray-700 p-4 flex items-center justify-between">
                <h3 className="text-lg font-bold text-[#f3ba2f]">User detail</h3>
                <button type="button" onClick={() => setDetailUserId(null)} className="text-2xl text-gray-400 hover:text-white leading-none">×</button>
              </div>
              <div className="p-4 flex-1">
                {detailLoading ? (
                  <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-[#f3ba2f] border-t-transparent rounded-full animate-spin" /></div>
                ) : detailData ? (
                  <>
                    <div className="space-y-2 mb-6">
                      <p><span className="text-gray-400">Name:</span> <strong>{String(detailData.user.name ?? '—')}</strong></p>
                      <p><span className="text-gray-400">Telegram ID:</span> <code className="text-sm">{String(detailData.user.telegramId ?? '—')}</code></p>
                      <p><span className="text-gray-400">Points:</span> <span className="text-[#f3ba2f] font-bold">{formatNumber(Number(detailData.user.points ?? 0))}</span></p>
                      <p><span className="text-gray-400">Total taps:</span> {formatNumber(Number(detailData.user.totalTaps ?? 0))}</p>
                      <p><span className="text-gray-400">Flagged:</span> {detailData.user.flaggedAsBot ? 'Yes' : 'No'} · <span className="text-gray-400">Frozen:</span> {detailData.user.isFrozen ? 'Yes' : 'No'}</p>
                      {detailData.user.suspensionReason != null && detailData.user.suspensionReason !== '' ? <p className="text-amber-400 text-sm">{String(detailData.user.suspensionReason)}</p> : null}
                    </div>
                    <div className="mb-6">
                      <h4 className="font-semibold text-gray-300 mb-2">Activities</h4>
                      <div className="flex flex-wrap gap-2 text-sm">
                        <span>T: {Number((detailData.user.activities as Record<string, number>)?.tasks ?? 0)}</span>
                        <span>Ref: {Number((detailData.user.activities as Record<string, number>)?.referrals ?? 0)}</span>
                        <span>DC: {Number((detailData.user.activities as Record<string, number>)?.dailyCiphers ?? 0)}</span>
                        <span>DCo: {Number((detailData.user.activities as Record<string, number>)?.dailyCombos ?? 0)}</span>
                        <span>C: {Number((detailData.user.activities as Record<string, number>)?.cards ?? 0)}</span>
                        <span>S: {Number((detailData.user.activities as Record<string, number>)?.stakes ?? 0)}</span>
                        <span>MG: {Number((detailData.user.activities as Record<string, number>)?.miniGames ?? 0)}</span>
                      </div>
                    </div>
                    <div className="mb-6">
                      <h4 className="font-semibold text-gray-300 mb-2">Received transfers (last 100)</h4>
                      <div className="max-h-48 overflow-y-auto border border-gray-600 rounded p-2 text-sm">
                        {detailData.receivedTransfers.length === 0 ? (
                          <p className="text-gray-500">None</p>
                        ) : (
                          <ul className="space-y-1">
                            {detailData.receivedTransfers.map((t) => (
                              <li key={t.id} className="grid grid-cols-[1fr_auto_auto] gap-2 items-center">
                                <span className="truncate">{t.from?.name ?? t.from?.telegramId ?? 'Unknown'}</span>
                                <span className="text-green-400">+{formatNumber(t.amount)}</span>
                                <span className="text-gray-500 text-xs">{new Date(t.createdAt).toLocaleString()}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-300 mb-2">Sent transfers (last 100)</h4>
                      <div className="max-h-48 overflow-y-auto border border-gray-600 rounded p-2 text-sm">
                        {detailData.sentTransfers.length === 0 ? (
                          <p className="text-gray-500">None</p>
                        ) : (
                          <ul className="space-y-1">
                            {detailData.sentTransfers.map((t) => (
                              <li key={t.id} className="grid grid-cols-[1fr_auto_auto] gap-2 items-center">
                                <span className="truncate">{t.to?.name ?? t.to?.telegramId ?? 'Unknown'}</span>
                                <span className="text-amber-400">−{formatNumber(t.amount)}</span>
                                <span className="text-gray-500 text-xs">{new Date(t.createdAt).toLocaleString()}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-gray-400">Could not load user details.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
