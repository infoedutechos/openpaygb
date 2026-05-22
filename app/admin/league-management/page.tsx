'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface TeamRow {
  id: string;
  name: string;
  inviteCode: string;
  creatorId: string;
  creatorName: string | null;
  creatorTelegramId: string;
  memberCount: number;
  members: { userId: string; name: string | null; telegramId: string }[];
  createdAt: string;
}

interface LeagueRow {
  id: string;
  name: string;
  inviteCode: string;
  weekKey: string;
  creatorId: string;
  creatorName: string | null;
  creatorTelegramId: string;
  creatorTeamId: string | null;
  teamCount: number;
  teams: { id: string; name: string }[];
  memberCount: number;
  members: { userId: string; name: string | null; telegramId: string }[];
  createdAt: string;
}

interface UserOption {
  id: string;
  name: string;
  telegramId: string;
}

export default function LeagueManagementPage() {
  const [tab, setTab] = useState<'teams' | 'leagues'>('teams');
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [leagues, setLeagues] = useState<LeagueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [showAddTeam, setShowAddTeam] = useState(false);
  const [showAddLeague, setShowAddLeague] = useState(false);
  const [showDonate, setShowDonate] = useState<TeamRow | null>(null);
  const [showAddTeamToLeague, setShowAddTeamToLeague] = useState<LeagueRow | null>(null);
  const [showRemoveTeamFromLeague, setShowRemoveTeamFromLeague] = useState<LeagueRow | null>(null);
  const [showEditTeam, setShowEditTeam] = useState<TeamRow | null>(null);
  const [showEditLeague, setShowEditLeague] = useState<LeagueRow | null>(null);
  const [showMembersTeam, setShowMembersTeam] = useState<TeamRow | null>(null);
  const [showMembersLeague, setShowMembersLeague] = useState<LeagueRow | null>(null);

  const [userSearch, setUserSearch] = useState('');
  const [users, setUsers] = useState<UserOption[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/league-management', { credentials: 'include', cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 403 && data.code === 'ITEM_REQUIRED') {
          setMessage({ type: 'error', text: 'Section password required. Open from Admin and enter the password.' });
        } else {
          setMessage({ type: 'error', text: data.error || 'Failed to load' });
        }
        setTeams([]);
        setLeagues([]);
        return;
      }
      setTeams(data.teams ?? []);
      setLeagues(data.leagues ?? []);
    } catch {
      setMessage({ type: 'error', text: 'Failed to load' });
      setTeams([]);
      setLeagues([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const searchUsers = useCallback(async (q: string) => {
    if (!q.trim()) {
      setUsers([]);
      return;
    }
    setUsersLoading(true);
    try {
      const res = await fetch(`/api/admin/accounts?search=${encodeURIComponent(q)}&limit=30`, { credentials: 'include' });
      const data = await res.json();
      if (res.ok && data.users) {
        setUsers(data.users.map((u: { id: string; name: string; telegramId: string }) => ({ id: u.id, name: u.name || 'Anonymous', telegramId: u.telegramId })));
      } else {
        setUsers([]);
      }
    } catch {
      setUsers([]);
    } finally {
      setUsersLoading(false);
    }
  }, []);

  const runAction = async (action: string, body: Record<string, unknown>) => {
    setMessage(null);
    try {
      const res = await fetch('/api/admin/league-management', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action, ...body }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: data.message || 'Done' });
        setShowAddTeam(false);
        setShowAddLeague(false);
        setShowDonate(null);
        setShowAddTeamToLeague(null);
        setShowRemoveTeamFromLeague(null);
        setShowEditTeam(null);
        setShowEditLeague(null);
        setShowMembersTeam(null);
        setShowMembersLeague(null);
        fetchData();
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Request failed' });
    }
  };

  return (
    <div className="min-h-screen bg-ura-panel text-white p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <Link href="/admin" className="text-[#f3ba2f] hover:underline mb-2 inline-block">
              ← Back to Admin
            </Link>
            <h1 className="text-3xl font-bold text-[#f3ba2f]">League Management</h1>
            <p className="text-gray-400 text-sm mt-1">Add, edit, delete teams and leagues. Donate PEARLS to team creators. Add or remove teams from leagues.</p>
          </div>
        </div>

        {message && (
          <div className={`p-4 rounded-lg mb-6 ${message.type === 'success' ? 'bg-green-600/20 text-green-300' : 'bg-red-600/20 text-red-300'}`}>
            {message.text}
            <button type="button" onClick={() => setMessage(null)} className="float-right font-bold">×</button>
          </div>
        )}

        <div className="flex gap-2 mb-6">
          <button
            type="button"
            onClick={() => setTab('teams')}
            className={`px-4 py-2 rounded-lg font-medium ${tab === 'teams' ? 'bg-ura-gold text-black' : 'bg-ura-panel-2 text-gray-300 hover:bg-[#3a3d42]'}`}
          >
            Teams ({teams.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('leagues')}
            className={`px-4 py-2 rounded-lg font-medium ${tab === 'leagues' ? 'bg-ura-gold text-black' : 'bg-ura-panel-2 text-gray-300 hover:bg-[#3a3d42]'}`}
          >
            Leagues ({leagues.length})
          </button>
        </div>

        {loading ? (
          <p className="text-gray-400 py-8">Loading…</p>
        ) : tab === 'teams' ? (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => { setShowAddTeam(true); setUserSearch(''); setUsers([]); }}
                className="px-4 py-2 rounded-lg bg-ura-gold text-black font-medium hover:bg-[#f4c141]"
              >
                Add team
              </button>
            </div>
            <ul className="space-y-3 md:hidden">
              {teams.map((t) => (
                <li
                  key={t.id}
                  className="rounded-lg border border-ura-border/75 bg-ura-panel-2/40 p-4 text-sm text-gray-300"
                >
                  <p className="font-medium text-white">{t.name}</p>
                  <p className="mt-1 font-mono text-xs">{t.inviteCode}</p>
                  <p className="mt-1 text-xs">Creator: {t.creatorName || t.creatorTelegramId}</p>
                  <p className="text-xs">Members: {t.memberCount}</p>
                  <div className="mt-3 flex flex-wrap gap-3">
                    <button type="button" onClick={() => setShowDonate(t)} className="min-h-[44px] text-sky-400 hover:underline">
                      Donate
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Delete team "${t.name}"? This cannot be undone.`)) {
                          runAction("deleteTeam", { teamId: t.id });
                        }
                      }}
                      className="min-h-[44px] text-red-400 hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            <div className="hidden overflow-x-auto rounded-lg border border-ura-border/75 md:block">
              <table className="w-full text-left text-sm">
                <thead className="bg-ura-panel-2 border-b border-ura-border/75">
                  <tr>
                    <th className="py-3 px-4 font-semibold">Name</th>
                    <th className="py-3 px-4 font-semibold">Invite code</th>
                    <th className="py-3 px-4 font-semibold">Creator</th>
                    <th className="py-3 px-4 font-semibold">Members</th>
                    <th className="py-3 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="text-gray-300">
                  {teams.map((t) => (
                    <tr key={t.id} className="border-b border-ura-border/85 hover:bg-ura-panel-2/50">
                      <td className="py-3 px-4 font-medium text-white">{t.name}</td>
                      <td className="py-3 px-4 font-mono text-xs">{t.inviteCode}</td>
                      <td className="py-3 px-4">{t.creatorName || t.creatorTelegramId}</td>
                      <td className="py-3 px-4">{t.memberCount}</td>
                      <td className="py-3 px-4 text-right">
                        <button type="button" onClick={() => setShowDonate(t)} className="text-sky-400 hover:underline mr-2">Donate</button>
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`Delete team "${t.name}"? This cannot be undone.`)) {
                              runAction('deleteTeam', { teamId: t.id });
                            }
                          }}
                          className="text-red-400 hover:underline"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {teams.length === 0 && <p className="text-gray-500 text-center py-8">No teams yet. Add one above.</p>}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => { setShowAddLeague(true); setUserSearch(''); setUsers([]); }}
                className="px-4 py-2 rounded-lg bg-ura-gold text-black font-medium hover:bg-[#f4c141]"
              >
                Add league
              </button>
            </div>
            <ul className="space-y-3 md:hidden">
              {leagues.map((l) => (
                <li
                  key={l.id}
                  className="rounded-lg border border-ura-border/75 bg-ura-panel-2/40 p-4 text-sm text-gray-300"
                >
                  <p className="font-medium text-white">{l.name}</p>
                  <p className="mt-1 text-xs">Week: {l.weekKey}</p>
                  <p className="mt-1 font-mono text-xs">{l.inviteCode}</p>
                  <p className="mt-1 text-xs">Creator: {l.creatorName || l.creatorTelegramId}</p>
                  <p className="text-xs">Teams: {l.teams.map((x) => x.name).join(", ") || "—"}</p>
                  <p className="text-xs">Members: {l.memberCount}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button type="button" onClick={() => setShowEditLeague(l)} className="min-h-[44px] text-gray-300 hover:underline">
                      Edit
                    </button>
                    <button type="button" onClick={() => setShowMembersLeague(l)} className="min-h-[44px] text-gray-300 hover:underline">
                      Members
                    </button>
                    <button type="button" onClick={() => setShowAddTeamToLeague(l)} className="min-h-[44px] text-sky-400 hover:underline">
                      Add team
                    </button>
                    <button type="button" onClick={() => setShowRemoveTeamFromLeague(l)} className="min-h-[44px] text-amber-400 hover:underline">
                      Remove team
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Delete league "${l.name}"? This cannot be undone.`)) {
                          runAction("deleteLeague", { leagueId: l.id });
                        }
                      }}
                      className="min-h-[44px] text-red-400 hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            <div className="hidden overflow-x-auto rounded-lg border border-ura-border/75 md:block">
              <table className="w-full text-left text-sm">
                <thead className="bg-ura-panel-2 border-b border-ura-border/75">
                  <tr>
                    <th className="py-3 px-4 font-semibold">Name</th>
                    <th className="py-3 px-4 font-semibold">Week</th>
                    <th className="py-3 px-4 font-semibold">Invite code</th>
                    <th className="py-3 px-4 font-semibold">Creator</th>
                    <th className="py-3 px-4 font-semibold">Teams</th>
                    <th className="py-3 px-4 font-semibold">Members</th>
                    <th className="py-3 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="text-gray-300">
                  {leagues.map((l) => (
                    <tr key={l.id} className="border-b border-ura-border/85 hover:bg-ura-panel-2/50">
                      <td className="py-3 px-4 font-medium text-white">{l.name}</td>
                      <td className="py-3 px-4">{l.weekKey}</td>
                      <td className="py-3 px-4 font-mono text-xs">{l.inviteCode}</td>
                      <td className="py-3 px-4">{l.creatorName || l.creatorTelegramId}</td>
                      <td className="py-3 px-4">{l.teams.map((x) => x.name).join(', ') || '—'}</td>
                      <td className="py-3 px-4">{l.memberCount}</td>
                      <td className="py-3 px-4 text-right">
                        <button type="button" onClick={() => setShowEditLeague(l)} className="text-gray-300 hover:underline mr-2">Edit</button>
                        <button type="button" onClick={() => setShowMembersLeague(l)} className="text-gray-300 hover:underline mr-2">Members</button>
                        <button type="button" onClick={() => setShowAddTeamToLeague(l)} className="text-sky-400 hover:underline mr-2">Add team</button>
                        <button type="button" onClick={() => setShowRemoveTeamFromLeague(l)} className="text-amber-400 hover:underline mr-2">Remove team</button>
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`Delete league "${l.name}"? This cannot be undone.`)) {
                              runAction('deleteLeague', { leagueId: l.id });
                            }
                          }}
                          className="text-red-400 hover:underline"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {leagues.length === 0 && <p className="text-gray-500 text-center py-8">No leagues yet. Add one above.</p>}
          </div>
        )}

        {/* Modal: Add team */}
        {showAddTeam && (
          <AddTeamModal
            users={users}
            userSearch={userSearch}
            setUserSearch={setUserSearch}
            usersLoading={usersLoading}
            searchUsers={searchUsers}
            onClose={() => setShowAddTeam(false)}
            onSubmit={(creatorUserId, name) => {
              runAction('createTeam', { creatorUserId, name });
            }}
          />
        )}

        {/* Modal: Add league */}
        {showAddLeague && (
          <AddLeagueModal
            teams={teams}
            users={users}
            userSearch={userSearch}
            setUserSearch={setUserSearch}
            usersLoading={usersLoading}
            searchUsers={searchUsers}
            onClose={() => setShowAddLeague(false)}
            onSubmit={(creatorUserId, teamId, name, weekKey) => {
              runAction('createLeague', { creatorUserId, teamId, name, weekKey: weekKey || undefined });
            }}
          />
        )}

        {/* Modal: Donate to team */}
        {showDonate && (
          <DonateModal
            team={showDonate}
            onClose={() => setShowDonate(null)}
            onSubmit={(amount) => {
              runAction('donateToTeam', { teamId: showDonate.id, amount });
            }}
          />
        )}

        {/* Modal: Add team to league */}
        {showAddTeamToLeague && (
          <AddTeamToLeagueModal
            league={showAddTeamToLeague}
            teams={teams}
            onClose={() => setShowAddTeamToLeague(null)}
            onSubmit={(teamId) => {
              runAction('addTeamToLeague', { leagueId: showAddTeamToLeague.id, teamId });
            }}
          />
        )}

        {showRemoveTeamFromLeague && (
          <RemoveTeamFromLeagueModal
            league={showRemoveTeamFromLeague}
            onClose={() => setShowRemoveTeamFromLeague(null)}
            onSubmit={(teamId) => {
              runAction('removeTeamFromLeague', { leagueId: showRemoveTeamFromLeague.id, teamId });
            }}
          />
        )}

        {showEditTeam && (
          <EditNameModal
            title="Edit team name"
            currentName={showEditTeam.name}
            onClose={() => setShowEditTeam(null)}
            onSubmit={(name) => {
              runAction('updateTeam', { teamId: showEditTeam.id, name });
            }}
          />
        )}

        {showEditLeague && (
          <EditNameModal
            title="Edit league name"
            currentName={showEditLeague.name}
            onClose={() => setShowEditLeague(null)}
            onSubmit={(name) => {
              runAction('updateLeague', { leagueId: showEditLeague.id, name });
            }}
          />
        )}

        {showMembersTeam && (
          <MembersModal
            title={`Team: ${showMembersTeam.name}`}
            members={showMembersTeam.members}
            onClose={() => setShowMembersTeam(null)}
          />
        )}

        {showMembersLeague && (
          <MembersModal
            title={`League: ${showMembersLeague.name}`}
            members={showMembersLeague.members}
            onClose={() => setShowMembersLeague(null)}
          />
        )}
      </div>
    </div>
  );
}

function AddTeamModal({
  users,
  userSearch,
  setUserSearch,
  usersLoading,
  searchUsers,
  onClose,
  onSubmit,
}: {
  users: UserOption[];
  userSearch: string;
  setUserSearch: (v: string) => void;
  usersLoading: boolean;
  searchUsers: (q: string) => void;
  onClose: () => void;
  onSubmit: (creatorUserId: string, name: string) => void;
}) {
  const [selectedUserId, setSelectedUserId] = useState('');
  const [name, setName] = useState('');
  const handleSearch = () => searchUsers(userSearch);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ura-navy/70 p-0 sm:items-center sm:p-4">
      <div className="bg-ura-panel-2 rounded-xl max-w-md w-full mx-4 p-6 shadow-xl">
        <h2 className="text-xl font-bold text-[#f3ba2f] mb-4">Add team</h2>
        <p className="text-gray-400 text-sm mb-4">Team will be created for the selected user (no PEARLS fee). Creator is auto-joined.</p>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Search user (name or Telegram ID)</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="flex-1 rounded-lg bg-ura-panel border border-ura-border/75 px-3 py-2 text-white"
                placeholder="Type and press Enter"
              />
              <button type="button" onClick={handleSearch} className="px-3 py-2 rounded-lg bg-[#3d4046] text-white">Search</button>
            </div>
            {usersLoading && <p className="text-xs text-gray-500 mt-1">Loading…</p>}
            {users.length > 0 && (
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="mt-2 w-full rounded-lg bg-ura-panel border border-ura-border/75 px-3 py-2 text-white"
              >
                <option value="">Select user</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.name || u.telegramId} ({u.telegramId})</option>
                ))}
              </select>
            )}
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Team name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg bg-ura-panel border border-ura-border/75 px-3 py-2 text-white"
              placeholder="Team name"
            />
          </div>
        </div>
        <div className="flex gap-2 mt-6">
          <button type="button" onClick={onClose} className="flex-1 py-2 rounded-lg bg-[#3d4046] text-white">Cancel</button>
          <button
            type="button"
            onClick={() => selectedUserId && name.trim() && onSubmit(selectedUserId, name.trim())}
            disabled={!selectedUserId || !name.trim()}
            className="flex-1 py-2 rounded-lg bg-ura-gold text-black font-medium disabled:opacity-50"
          >
            Create team
          </button>
        </div>
      </div>
    </div>
  );
}

function AddLeagueModal({
  teams,
  users,
  userSearch,
  setUserSearch,
  usersLoading,
  searchUsers,
  onClose,
  onSubmit,
}: {
  teams: TeamRow[];
  users: UserOption[];
  userSearch: string;
  setUserSearch: (v: string) => void;
  usersLoading: boolean;
  searchUsers: (q: string) => void;
  onClose: () => void;
  onSubmit: (creatorUserId: string, teamId: string, name: string, weekKey: string) => void;
}) {
  const [selectedUserId, setSelectedUserId] = useState('');
  const [teamId, setTeamId] = useState('');
  const [name, setName] = useState('');
  const [weekKey, setWeekKey] = useState('');
  const creatorTeams = teams.filter((t) => t.creatorId === selectedUserId);
  const handleSearch = () => searchUsers(userSearch);
  useEffect(() => {
    if (!selectedUserId) setTeamId('');
    else {
      const ct = teams.filter((t) => t.creatorId === selectedUserId);
      setTeamId(ct[0]?.id ?? '');
    }
  }, [selectedUserId, teams]);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ura-navy/70 p-0 sm:items-center sm:p-4">
      <div className="bg-ura-panel-2 rounded-xl max-w-md w-full mx-4 p-6 shadow-xl">
        <h2 className="text-xl font-bold text-[#f3ba2f] mb-4">Add league</h2>
        <p className="text-gray-400 text-sm mb-4">League will be created with the selected team as creator (no PEARLS fee).</p>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Search user (creator)</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="flex-1 rounded-lg bg-ura-panel border border-ura-border/75 px-3 py-2 text-white"
              />
              <button type="button" onClick={handleSearch} disabled={usersLoading} className="px-3 py-2 rounded-lg bg-[#3d4046] text-white disabled:opacity-50">
                {usersLoading ? '…' : 'Search'}
              </button>
            </div>
            {usersLoading && <p className="text-xs text-gray-500 mt-1">Loading users…</p>}
            {users.length > 0 && (
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="mt-2 w-full rounded-lg bg-ura-panel border border-ura-border/75 px-3 py-2 text-white"
              >
                <option value="">Select user</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.name || u.telegramId}</option>
                ))}
              </select>
            )}
          </div>
          {selectedUserId && (
            <div>
              <label className="block text-sm text-gray-400 mb-1">Team (owned by this user)</label>
              <select
                value={teamId}
                onChange={(e) => setTeamId(e.target.value)}
                className="w-full rounded-lg bg-ura-panel border border-ura-border/75 px-3 py-2 text-white"
              >
                <option value="">Select team</option>
                {creatorTeams.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
              {creatorTeams.length === 0 && <p className="text-xs text-amber-400 mt-1">This user has no teams. Create a team first.</p>}
            </div>
          )}
          <div>
            <label className="block text-sm text-gray-400 mb-1">League name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-lg bg-ura-panel border border-ura-border/75 px-3 py-2 text-white" placeholder="League name" />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Week key (optional, e.g. 2025-W08)</label>
            <input type="text" value={weekKey} onChange={(e) => setWeekKey(e.target.value)} className="w-full rounded-lg bg-ura-panel border border-ura-border/75 px-3 py-2 text-white" placeholder="Leave blank for current week" />
          </div>
        </div>
        <div className="flex gap-2 mt-6">
          <button type="button" onClick={onClose} className="flex-1 py-2 rounded-lg bg-[#3d4046] text-white">Cancel</button>
          <button
            type="button"
            onClick={() => selectedUserId && teamId && name.trim() && onSubmit(selectedUserId, teamId, name.trim(), weekKey.trim())}
            disabled={!selectedUserId || !teamId || !name.trim()}
            className="flex-1 py-2 rounded-lg bg-ura-gold text-black font-medium disabled:opacity-50"
          >
            Create league
          </button>
        </div>
      </div>
    </div>
  );
}

function DonateModal({ team, onClose, onSubmit }: { team: TeamRow; onClose: () => void; onSubmit: (amount: number) => void }) {
  const [amount, setAmount] = useState('');
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ura-navy/70 p-0 sm:items-center sm:p-4">
      <div className="bg-ura-panel-2 rounded-xl max-w-sm w-full mx-4 p-6 shadow-xl">
        <h2 className="text-xl font-bold text-[#f3ba2f] mb-2">Donate to team</h2>
        <p className="text-gray-400 text-sm mb-4">PEARLS will be added to the team creator&apos;s balance: {team.creatorName || team.creatorTelegramId}</p>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Amount PEARLS"
          className="w-full rounded-lg bg-ura-panel border border-ura-border/75 px-3 py-2 text-white mb-4"
        />
        <div className="flex gap-2">
          <button type="button" onClick={onClose} className="flex-1 py-2 rounded-lg bg-[#3d4046] text-white">Cancel</button>
          <button
            type="button"
            onClick={() => {
              const n = Math.floor(Number(amount));
              if (Number.isFinite(n) && n > 0) onSubmit(n);
            }}
            disabled={!Number.isFinite(Number(amount)) || Number(amount) <= 0}
            className="flex-1 py-2 rounded-lg bg-ura-gold text-black font-medium disabled:opacity-50"
          >
            Donate
          </button>
        </div>
      </div>
    </div>
  );
}

function AddTeamToLeagueModal({
  league,
  teams,
  onClose,
  onSubmit,
}: {
  league: LeagueRow;
  teams: TeamRow[];
  onClose: () => void;
  onSubmit: (teamId: string) => void;
}) {
  const alreadyInLeague = new Set(league.teams.map((t) => t.id));
  const available = teams.filter((t) => !alreadyInLeague.has(t.id));
  const [teamId, setTeamId] = useState(available[0]?.id ?? '');
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ura-navy/70 p-0 sm:items-center sm:p-4">
      <div className="bg-ura-panel-2 rounded-xl max-w-sm w-full mx-4 p-6 shadow-xl">
        <h2 className="text-xl font-bold text-[#f3ba2f] mb-2">Add team to league</h2>
        <p className="text-gray-400 text-sm mb-4">League: {league.name}</p>
        <select
          value={teamId}
          onChange={(e) => setTeamId(e.target.value)}
          className="w-full rounded-lg bg-ura-panel border border-ura-border/75 px-3 py-2 text-white mb-4"
        >
          <option value="">Select team</option>
          {available.map((t) => (
            <option key={t.id} value={t.id}>{t.name} ({t.creatorName || t.creatorTelegramId})</option>
          ))}
        </select>
        {available.length === 0 && <p className="text-amber-400 text-sm mb-4">All teams are already in this league.</p>}
        <div className="flex gap-2">
          <button type="button" onClick={onClose} className="flex-1 py-2 rounded-lg bg-[#3d4046] text-white">Cancel</button>
          <button
            type="button"
            onClick={() => teamId && onSubmit(teamId)}
            disabled={!teamId}
            className="flex-1 py-2 rounded-lg bg-ura-gold text-black font-medium disabled:opacity-50"
          >
            Add team
          </button>
        </div>
      </div>
    </div>
  );
}

function RemoveTeamFromLeagueModal({
  league,
  onClose,
  onSubmit,
}: {
  league: LeagueRow;
  onClose: () => void;
  onSubmit: (teamId: string) => void;
}) {
  const [teamId, setTeamId] = useState(league.teams[0]?.id ?? '');
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ura-navy/70 p-0 sm:items-center sm:p-4">
      <div className="bg-ura-panel-2 rounded-xl max-w-sm w-full mx-4 p-6 shadow-xl">
        <h2 className="text-xl font-bold text-[#f3ba2f] mb-2">Remove team from league</h2>
        <p className="text-gray-400 text-sm mb-4">League: {league.name}</p>
        <select
          value={teamId}
          onChange={(e) => setTeamId(e.target.value)}
          className="w-full rounded-lg bg-ura-panel border border-ura-border/75 px-3 py-2 text-white mb-4"
        >
          <option value="">Select team</option>
          {league.teams.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
        {league.teams.length === 0 && <p className="text-amber-400 text-sm mb-4">No teams in this league.</p>}
        <div className="flex gap-2">
          <button type="button" onClick={onClose} className="flex-1 py-2 rounded-lg bg-[#3d4046] text-white">Cancel</button>
          <button
            type="button"
            onClick={() => teamId && onSubmit(teamId)}
            disabled={!teamId}
            className="flex-1 py-2 rounded-lg bg-amber-500 text-black font-medium disabled:opacity-50"
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}

function EditNameModal({
  title,
  currentName,
  onClose,
  onSubmit,
}: {
  title: string;
  currentName: string;
  onClose: () => void;
  onSubmit: (name: string) => void;
}) {
  const [name, setName] = useState(currentName);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ura-navy/70 p-0 sm:items-center sm:p-4">
      <div className="bg-ura-panel-2 rounded-xl max-w-sm w-full mx-4 p-6 shadow-xl">
        <h2 className="text-xl font-bold text-[#f3ba2f] mb-4">{title}</h2>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-lg bg-ura-panel border border-ura-border/75 px-3 py-2 text-white mb-4"
          placeholder="Name"
        />
        <div className="flex gap-2">
          <button type="button" onClick={onClose} className="flex-1 py-2 rounded-lg bg-[#3d4046] text-white">Cancel</button>
          <button
            type="button"
            onClick={() => name.trim() && onSubmit(name.trim())}
            disabled={!name.trim()}
            className="flex-1 py-2 rounded-lg bg-ura-gold text-black font-medium disabled:opacity-50"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

function MembersModal({
  title,
  members,
  onClose,
}: {
  title: string;
  members: { userId: string; name: string | null; telegramId: string }[];
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ura-navy/70 p-0 sm:items-center sm:p-4">
      <div className="bg-ura-panel-2 rounded-xl max-w-md w-full mx-4 max-h-[80vh] flex flex-col shadow-xl">
        <div className="flex items-center justify-between p-4 border-b border-ura-border/75 shrink-0">
          <h2 className="text-xl font-bold text-[#f3ba2f]">{title}</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-white text-2xl">&times;</button>
        </div>
        <div className="p-4 overflow-y-auto flex-1">
          <p className="text-gray-400 text-sm mb-2">Members ({members.length})</p>
          <ul className="space-y-2">
            {members.map((m) => (
              <li key={m.userId} className="flex justify-between items-center py-2 border-b border-ura-border/85/50 text-sm">
                <span className="text-white truncate">{m.name || 'Anonymous'}</span>
                <span className="text-gray-400 font-mono text-xs shrink-0 ml-2">{m.telegramId}</span>
              </li>
            ))}
          </ul>
          {members.length === 0 && <p className="text-gray-500 py-4">No members.</p>}
        </div>
        <div className="p-4 border-t border-ura-border/75 shrink-0">
          <button type="button" onClick={onClose} className="w-full py-2 rounded-lg bg-[#3d4046] text-white">Close</button>
        </div>
      </div>
    </div>
  );
}
