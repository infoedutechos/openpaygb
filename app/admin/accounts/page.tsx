// app/admin/accounts/page.tsx

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import ItemPasswordGate from '@/app/admin/ItemPasswordGate';

interface UserAccount {
  rank: number;
  id: string;
  telegramId: string;
  name: string;
  points: number;
  pointsBalance: number;
  whitePearls: number;
  bluePearls: number;
  goldishPearls: number;
  region: string | null;
  isPremium: boolean;
  isFrozen: boolean;
  isHidden: boolean;
  createdAt: string;
  referralPointsEarned: number;
  mineLevelIndex: number;
  dailyRewardStreakDay: number;
  activities: {
    tasks: number;
    referrals: number;
    dailyCiphers: number;
    dailyCombos: number;
    cards: number;
    stakes: number;
    miniGames: number;
  };
}

interface Summary {
  totalUsers: number;
  totalPoints: number;
  frozenCount: number;
  hiddenCount: number;
}

export default function AccountsAdminPage() {
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [showFrozen, setShowFrozen] = useState(false);
  const [showHidden, setShowHidden] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [itemPasswordRequired, setItemPasswordRequired] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    action: string;
    label: string;
    allUsers?: boolean;
  } | null>(null);

  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50',
      });
      if (search) params.set('search', search);
      if (showFrozen) params.set('showFrozen', 'true');
      if (showHidden) params.set('showHidden', 'true');

      const res = await fetch(`/api/admin/accounts?${params}`, { credentials: 'include', cache: 'no-store' });
      const data = await res.json();

      if (!res.ok) {
        if (res.status === 403 && (data as { code?: string }).code === 'ITEM_REQUIRED') {
          setItemPasswordRequired(true);
          setMessage(null);
          setUsers([]);
          setSummary(null);
          return;
        }
        setMessage({ type: 'error', text: 'Failed to fetch accounts' });
        setUsers([]);
        setSummary(null);
        return;
      }
      setUsers(data.users || []);
      setTotalPages(data.pagination?.totalPages || 1);
      setSummary(data.summary || null);
    } catch (error) {
      console.error('Failed to fetch accounts:', error);
      setMessage({ type: 'error', text: 'Failed to fetch accounts' });
    } finally {
      setLoading(false);
    }
  }, [page, search, showFrozen, showHidden]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const handleAction = async (action: string, allUsers = false) => {
    setActionLoading(true);
    setConfirmAction(null);
    try {
      const body: Record<string, unknown> = { action };
      if (allUsers) {
        body.allUsers = true;
      } else {
        body.userIds = Array.from(selectedUsers);
      }

      const res = await fetch('/api/admin/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        credentials: 'include',
      });

      const data = await res.json();

      if (res.ok) {
        setMessage({ type: 'success', text: data.message || 'Action completed' });
        setSelectedUsers(new Set());
        fetchAccounts();
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
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedUsers(newSet);
  };

  const toggleSelectAll = () => {
    if (selectedUsers.size === users.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(users.map(u => u.id)));
    }
  };

  const formatNumber = (num: number): string => {
    if (num >= 1e12) return (num / 1e12).toFixed(1) + 'T';
    if (num >= 1e9) return (num / 1e9).toFixed(1) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
    return num.toString();
  };

  if (itemPasswordRequired) {
    return <ItemPasswordGate pathname="/admin/accounts" />;
  }

  return (
    <div className="min-h-screen bg-ura-panel text-white p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link href="/admin" className="text-[#f3ba2f] hover:underline mb-2 inline-block">
              ← Back to Admin
            </Link>
            <h1 className="text-3xl font-bold text-[#f3ba2f]">Account Management</h1>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div
            className={`p-4 rounded-lg mb-6 ${
              message.type === 'success' ? 'bg-green-600' : 'bg-red-600'
            }`}
          >
            {message.text}
            <button
              onClick={() => setMessage(null)}
              className="float-right font-bold"
            >
              ×
            </button>
          </div>
        )}

        {/* Summary Stats */}
        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-ura-panel-2 p-4 rounded-lg">
              <div className="text-sm text-gray-400">Total Users</div>
              <div className="text-2xl font-bold">{formatNumber(summary.totalUsers)}</div>
            </div>
            <div className="bg-ura-panel-2 p-4 rounded-lg">
              <div className="text-sm text-gray-400">Total Points</div>
              <div className="text-2xl font-bold text-[#f3ba2f]">
                {formatNumber(summary.totalPoints)}
              </div>
            </div>
            <div className="bg-ura-panel-2 p-4 rounded-lg">
              <div className="text-sm text-gray-400">Frozen Accounts</div>
              <div className="text-2xl font-bold text-red-400">{summary.frozenCount}</div>
            </div>
            <div className="bg-ura-panel-2 p-4 rounded-lg">
              <div className="text-sm text-gray-400">Hidden Accounts</div>
              <div className="text-2xl font-bold text-gray-400">{summary.hiddenCount}</div>
            </div>
          </div>
        )}

        {/* Bulk Actions - All Users + Delete selected */}
        <div className="bg-ura-panel-2 p-4 rounded-lg mb-6">
          <h2 className="text-lg font-semibold mb-4 text-red-400">
            ⚠️ Bulk Actions (All Users) - Testing Only
          </h2>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setConfirmAction({ action: 'reset_all', label: 'Reset ALL Users', allUsers: true })}
              disabled={actionLoading}
              className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg font-semibold disabled:opacity-50"
            >
              Reset All Points & Activities
            </button>
            <button
              onClick={() => setConfirmAction({ action: 'freeze_all', label: 'Freeze ALL Users', allUsers: true })}
              disabled={actionLoading}
              className="bg-orange-600 hover:bg-orange-700 px-4 py-2 rounded-lg font-semibold disabled:opacity-50"
            >
              Freeze All
            </button>
            <button
              onClick={() => setConfirmAction({ action: 'unfreeze_all', label: 'Unfreeze ALL Users', allUsers: true })}
              disabled={actionLoading}
              className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg font-semibold disabled:opacity-50"
            >
              Unfreeze All
            </button>
            <button
              onClick={() => setConfirmAction({ action: 'hide_all', label: 'Hide ALL Users', allUsers: true })}
              disabled={actionLoading}
              className="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded-lg font-semibold disabled:opacity-50"
            >
              Hide All
            </button>
            <button
              onClick={() => setConfirmAction({ action: 'unhide_all', label: 'Unhide ALL Users', allUsers: true })}
              disabled={actionLoading}
              className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg font-semibold disabled:opacity-50"
            >
              Unhide All
            </button>
            <button
              onClick={() => setConfirmAction({ action: 'delete', label: 'Permanently delete selected user accounts' })}
              disabled={actionLoading || selectedUsers.size === 0}
              className="bg-rose-700 hover:bg-rose-800 px-4 py-2 rounded-lg font-semibold disabled:opacity-50"
            >
              Delete selected
            </button>
          </div>
          <p className="text-gray-500 text-sm mt-2">
            Delete selected: tick one or more users in the table below, then click Delete selected above.
          </p>
        </div>

        {/* Delete / actions for selected users — visible at top */}
        <div className="bg-[#252830] border border-rose-900/50 p-4 rounded-lg mb-6">
          <h2 className="text-lg font-semibold mb-3 text-rose-300">
            Delete or manage selected users
          </h2>
          <p className="text-gray-400 text-sm mb-3">
            Select one or more users in the table below (checkboxes), then click an action.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setConfirmAction({ action: 'reset', label: 'Reset Selected Users' })}
              disabled={actionLoading || selectedUsers.size === 0}
              className="bg-red-600 hover:bg-red-700 px-3 py-2 rounded-lg font-semibold disabled:opacity-50"
            >
              Reset
            </button>
            <button
              onClick={() => setConfirmAction({ action: 'delete', label: 'Permanently delete selected user accounts' })}
              disabled={actionLoading || selectedUsers.size === 0}
              className="bg-rose-700 hover:bg-rose-800 px-3 py-2 rounded-lg font-semibold disabled:opacity-50"
            >
              Delete
            </button>
            <button
              onClick={() => handleAction('freeze')}
              disabled={actionLoading || selectedUsers.size === 0}
              className="bg-orange-600 hover:bg-orange-700 px-3 py-2 rounded-lg font-semibold disabled:opacity-50"
            >
              Freeze
            </button>
            <button
              onClick={() => handleAction('unfreeze')}
              disabled={actionLoading || selectedUsers.size === 0}
              className="bg-green-600 hover:bg-green-700 px-3 py-2 rounded-lg font-semibold disabled:opacity-50"
            >
              Unfreeze
            </button>
            <button
              onClick={() => handleAction('hide')}
              disabled={actionLoading || selectedUsers.size === 0}
              className="bg-gray-600 hover:bg-gray-700 px-3 py-2 rounded-lg font-semibold disabled:opacity-50"
            >
              Hide
            </button>
            <button
              onClick={() => handleAction('unhide')}
              disabled={actionLoading || selectedUsers.size === 0}
              className="bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded-lg font-semibold disabled:opacity-50"
            >
              Unhide
            </button>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="bg-ura-panel-2 p-4 rounded-lg mb-6">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="w-full min-w-0 flex-1 sm:min-w-[200px]">
              <input
                type="text"
                placeholder="Search by name or Telegram ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchAccounts()}
                className="w-full bg-ura-panel text-white px-4 py-2 rounded-lg border border-gray-600 focus:border-[#f3ba2f] outline-none"
              />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showFrozen}
                onChange={(e) => {
                  setShowFrozen(e.target.checked);
                  setPage(1);
                }}
                className="w-4 h-4"
              />
              <span>Frozen Only</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showHidden}
                onChange={(e) => {
                  setShowHidden(e.target.checked);
                  setPage(1);
                }}
                className="w-4 h-4"
              />
              <span>Hidden Only</span>
            </label>
            <button
              onClick={() => {
                setPage(1);
                fetchAccounts();
              }}
              className="bg-ura-gold text-black px-4 py-2 rounded-lg font-semibold"
            >
              Search
            </button>
          </div>
        </div>

        {/* Selected Users Actions — always visible; select users in table then use actions */}
        <div className="bg-[#3a3d42] p-4 rounded-lg mb-6 flex flex-wrap gap-4 items-center">
          <span className="font-semibold">
            {selectedUsers.size} user(s) selected — select rows below to Delete, Reset, Freeze, etc.
          </span>
          <button
            onClick={() => setConfirmAction({ action: 'reset', label: 'Reset Selected Users' })}
            disabled={actionLoading || selectedUsers.size === 0}
            className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded font-semibold disabled:opacity-50"
          >
            Reset
          </button>
          <button
            onClick={() => setConfirmAction({ action: 'delete', label: 'Permanently delete selected user accounts' })}
            disabled={actionLoading || selectedUsers.size === 0}
            className="bg-rose-800 hover:bg-rose-900 px-3 py-1 rounded font-semibold disabled:opacity-50"
          >
            Delete
          </button>
          <button
            onClick={() => handleAction('freeze')}
            disabled={actionLoading || selectedUsers.size === 0}
            className="bg-orange-600 hover:bg-orange-700 px-3 py-1 rounded font-semibold disabled:opacity-50"
          >
            Freeze
          </button>
          <button
            onClick={() => handleAction('unfreeze')}
            disabled={actionLoading || selectedUsers.size === 0}
            className="bg-green-600 hover:bg-green-700 px-3 py-1 rounded font-semibold disabled:opacity-50"
          >
            Unfreeze
          </button>
          <button
            onClick={() => handleAction('hide')}
            disabled={actionLoading || selectedUsers.size === 0}
            className="bg-gray-600 hover:bg-gray-700 px-3 py-1 rounded font-semibold disabled:opacity-50"
          >
            Hide
          </button>
          <button
            onClick={() => handleAction('unhide')}
            disabled={actionLoading || selectedUsers.size === 0}
            className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded font-semibold disabled:opacity-50"
          >
            Unhide
          </button>
          {selectedUsers.size > 0 && (
            <button
              onClick={() => setSelectedUsers(new Set())}
              className="text-gray-400 hover:text-white px-3 py-1"
            >
              Clear Selection
            </button>
          )}
        </div>

        {/* Users Table */}
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
                  className={`space-y-3 p-4 ${selectedUsers.has(user.id) ? "bg-[#3a3d42]" : ""}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <label className="flex min-h-[44px] flex-1 cursor-pointer items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedUsers.has(user.id)}
                        onChange={() => toggleSelectUser(user.id)}
                        className="h-4 w-4 shrink-0"
                      />
                      <span>
                        <span className="text-xs text-gray-500">#{user.rank}</span>{" "}
                        <span className="font-semibold text-white">{user.name}</span>
                        {user.isPremium ? (
                          <span className="ml-1 rounded bg-blue-500 px-1 text-[10px]">P</span>
                        ) : null}
                      </span>
                    </label>
                  </div>
                  <p className="font-mono text-xs text-gray-400">{user.telegramId}</p>
                  <p className="text-xs text-gray-400">Region: {user.region?.toUpperCase() || "N/A"}</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-gray-500">Points </span>
                      <span className="font-bold text-[#f3ba2f]">{formatNumber(user.points)}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Pearls </span>
                      <span className="text-slate-200">
                        W {formatNumber(user.whitePearls)} · B {formatNumber(user.bluePearls)}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {user.isFrozen && (
                      <span className="rounded bg-red-500/80 px-2 py-0.5 text-[10px]">Frozen</span>
                    )}
                    {user.isHidden && (
                      <span className="rounded bg-gray-500 px-2 py-0.5 text-[10px]">Hidden</span>
                    )}
                    {!user.isFrozen && !user.isHidden && (
                      <span className="rounded bg-green-500/80 px-2 py-0.5 text-[10px]">Active</span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedUsers(new Set([user.id]));
                        setConfirmAction({ action: "reset", label: `Reset ${user.name}` });
                      }}
                      className="min-h-[44px] rounded bg-red-600/50 px-3 py-2 text-xs hover:bg-red-600"
                    >
                      Reset
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedUsers(new Set([user.id]));
                        setConfirmAction({ action: "delete", label: `Permanently delete ${user.name}` });
                      }}
                      className="min-h-[44px] rounded bg-rose-800/50 px-3 py-2 text-xs hover:bg-rose-800"
                    >
                      Delete
                    </button>
                    {user.isFrozen ? (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedUsers(new Set([user.id]));
                          handleAction("unfreeze");
                        }}
                        className="min-h-[44px] rounded bg-green-600/50 px-3 py-2 text-xs hover:bg-green-600"
                      >
                        Unfreeze
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedUsers(new Set([user.id]));
                          handleAction("freeze");
                        }}
                        className="min-h-[44px] rounded bg-orange-600/50 px-3 py-2 text-xs hover:bg-orange-600"
                      >
                        Freeze
                      </button>
                    )}
                    {user.isHidden ? (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedUsers(new Set([user.id]));
                          handleAction("unhide");
                        }}
                        className="min-h-[44px] rounded bg-blue-600/50 px-3 py-2 text-xs hover:bg-blue-600"
                      >
                        Unhide
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedUsers(new Set([user.id]));
                          handleAction("hide");
                        }}
                        className="min-h-[44px] rounded bg-gray-600/50 px-3 py-2 text-xs hover:bg-gray-600"
                      >
                        Hide
                      </button>
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
                        checked={selectedUsers.size === users.length && users.length > 0}
                        onChange={toggleSelectAll}
                        className="w-4 h-4"
                      />
                    </th>
                    <th className="p-3 text-left">#</th>
                    <th className="p-3 text-left">Name</th>
                    <th className="p-3 text-left">Telegram ID</th>
                    <th className="p-3 text-left">Region</th>
                    <th className="p-3 text-right">Points</th>
                    <th className="p-3 text-right">White</th>
                    <th className="p-3 text-right">Blue</th>
                    <th className="p-3 text-right">Goldish</th>
                    <th className="p-3 text-center">Tasks</th>
                    <th className="p-3 text-center">Referrals</th>
                    <th className="p-3 text-center">Status</th>
                    <th className="p-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {users.map((user) => (
                    <tr
                      key={user.id}
                      className={`hover:bg-[#3a3d42] ${
                        selectedUsers.has(user.id) ? 'bg-[#3a3d42]' : ''
                      }`}
                    >
                      <td className="p-3">
                        <input
                          type="checkbox"
                          checked={selectedUsers.has(user.id)}
                          onChange={() => toggleSelectUser(user.id)}
                          className="w-4 h-4"
                        />
                      </td>
                      <td className="p-3 text-gray-400">{user.rank}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{user.name}</span>
                          {user.isPremium && (
                            <span className="text-xs bg-blue-500 px-1 rounded">P</span>
                          )}
                        </div>
                      </td>
                      <td className="p-3 text-gray-400 font-mono text-sm">{user.telegramId}</td>
                      <td className="p-3">{user.region?.toUpperCase() || 'N/A'}</td>
                      <td className="p-3 text-right text-[#f3ba2f] font-bold">
                        {formatNumber(user.points)}
                      </td>
                      <td className="p-3 text-right text-slate-200 font-semibold">
                        {formatNumber(user.whitePearls)}
                      </td>
                      <td className="p-3 text-right text-[#5fa8ff] font-semibold">
                        {formatNumber(user.bluePearls)}
                      </td>
                      <td className="p-3 text-right text-[#f3ba2f] font-semibold">
                        {formatNumber(user.goldishPearls)}
                      </td>
                      <td className="p-3 text-center">{user.activities.tasks}</td>
                      <td className="p-3 text-center">{user.activities.referrals}</td>
                      <td className="p-3 text-center">
                        <div className="flex justify-center gap-1">
                          {user.isFrozen && (
                            <span className="text-xs bg-red-500 px-2 py-0.5 rounded">Frozen</span>
                          )}
                          {user.isHidden && (
                            <span className="text-xs bg-gray-500 px-2 py-0.5 rounded">Hidden</span>
                          )}
                          {!user.isFrozen && !user.isHidden && (
                            <span className="text-xs bg-green-500 px-2 py-0.5 rounded">Active</span>
                          )}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex justify-center gap-1">
                          <button
                            onClick={() => {
                              setSelectedUsers(new Set([user.id]));
                              setConfirmAction({ action: 'reset', label: `Reset ${user.name}` });
                            }}
                            className="text-xs bg-red-600/50 hover:bg-red-600 px-2 py-1 rounded"
                            title="Reset"
                          >
                            Reset
                          </button>
                          <button
                            onClick={() => {
                              setSelectedUsers(new Set([user.id]));
                              setConfirmAction({ action: 'delete', label: `Permanently delete ${user.name}` });
                            }}
                            className="text-xs bg-rose-800/50 hover:bg-rose-800 px-2 py-1 rounded"
                            title="Delete account"
                          >
                            Delete
                          </button>
                          {user.isFrozen ? (
                            <button
                              onClick={() => {
                                setSelectedUsers(new Set([user.id]));
                                handleAction('unfreeze');
                              }}
                              className="text-xs bg-green-600/50 hover:bg-green-600 px-2 py-1 rounded"
                            >
                              Unfreeze
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                setSelectedUsers(new Set([user.id]));
                                handleAction('freeze');
                              }}
                              className="text-xs bg-orange-600/50 hover:bg-orange-600 px-2 py-1 rounded"
                            >
                              Freeze
                            </button>
                          )}
                          {user.isHidden ? (
                            <button
                              onClick={() => {
                                setSelectedUsers(new Set([user.id]));
                                handleAction('unhide');
                              }}
                              className="text-xs bg-blue-600/50 hover:bg-blue-600 px-2 py-1 rounded"
                            >
                              Unhide
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                setSelectedUsers(new Set([user.id]));
                                handleAction('hide');
                              }}
                              className="text-xs bg-gray-600/50 hover:bg-gray-600 px-2 py-1 rounded"
                            >
                              Hide
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-center gap-4">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-4 py-2 bg-ura-panel-2 text-white rounded-lg disabled:opacity-50"
            >
              Previous
            </button>
            <span>
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 bg-ura-panel-2 text-white rounded-lg disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}

        {/* Confirmation Modal */}
        {confirmAction && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-ura-navy/80 p-0 sm:items-center sm:p-4">
            <div className="bg-ura-panel-2 rounded-xl p-6 max-w-md w-full">
              <h3 className="text-xl font-bold mb-4 text-red-400">Confirm Action</h3>
              <p className="text-gray-300 mb-6">
                Are you sure you want to <strong>{confirmAction.label}</strong>?
                {confirmAction.allUsers && (
                  <span className="block mt-2 text-red-400">
                    This will affect ALL users in the database!
                  </span>
                )}
                {confirmAction.action.includes('reset') && !confirmAction.action.includes('delete') && (
                  <span className="block mt-2 text-yellow-400">
                    This will reset all points, balances, activities, upgrades, and progress to zero.
                    This action cannot be undone!
                  </span>
                )}
                {confirmAction.action === 'delete' && (
                  <span className="block mt-2 text-rose-400">
                    The selected user account(s) and all their data (teams, leagues, transfers, etc.) will be permanently removed. This cannot be undone!
                  </span>
                )}
              </p>
              <div className="flex gap-4">
                <button
                  onClick={() => setConfirmAction(null)}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 py-2 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleAction(confirmAction.action, confirmAction.allUsers)}
                  disabled={actionLoading}
                  className="flex-1 bg-red-600 hover:bg-red-700 py-2 rounded-lg font-semibold disabled:opacity-50"
                >
                  {actionLoading ? 'Processing...' : 'Confirm'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
