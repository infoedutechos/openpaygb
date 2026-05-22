// components/popups/GlobalRankingPopup.tsx

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Image from 'next/image';
import Cross from '@/icons/Cross';
import { triggerHapticFeedback } from '@/utils/ui';
import { LEVELS } from '@/utils/consts';
import { calculateLevelIndex } from '@/utils/game-mechanics';
import { useGameStore } from '@/utils/game-mechanics';
import {
  DISTRICT_FILTER_NONE,
  DISTRICT_FILTER_OTHER,
} from '@/utils/uganda-districts';

interface UserRanking {
  rank: number;
  id: string;
  telegramId: string;
  name: string;
  points: number;
  pointsBalance: number;
  region: string | null;
  regionName: string;
  district?: string | null;
  districtName?: string;
  isPremium: boolean;
  isFrozen: boolean;
  createdAt: string;
  referralPointsEarned: number;
  mineLevelIndex: number;
  multitapLevelIndex: number;
  energyLimitLevelIndex: number;
  activitiesCompleted: {
    tasks: number;
    referrals: number;
    dailyCiphers: number;
    dailyCombos: number;
    cardsCollected: number;
    stakesCreated: number;
  };
  totalDonatedPoints: number;
}

interface RegionStat {
  code: string;
  name: string;
  count: number;
}

interface RegionGroup {
  id: string;
  name: string;
}

interface DistrictStat {
  slug: string;
  name: string;
  count: number;
}

interface DistrictMeta {
  noDistrict: number;
  otherDistrict: number;
}

interface Props {
  onClose: () => void;
}

interface MyRankData {
  rank: number;
  totalPlayers: number;
  name: string;
  points: number;
  levelName: string;
  gameLevelIndex: number;
}

export default function GlobalRankingPopup({ onClose }: Props) {
  const { userTelegramInitData } = useGameStore();
  const [users, setUsers] = useState<UserRanking[]>([]);
  const [regions, setRegions] = useState<RegionStat[]>([]);
  const [regionGroups, setRegionGroups] = useState<RegionGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [search, setSearch] = useState('');
  const [regionFilter, setRegionFilter] = useState(''); // '' | 'group:Europe' | 'de' (country code)
  const [districtFilter, setDistrictFilter] = useState(''); // '' | slug | __none__ | __other__
  const [districts, setDistricts] = useState<DistrictStat[]>([]);
  const [districtMeta, setDistrictMeta] = useState<DistrictMeta>({ noDistrict: 0, otherDistrict: 0 });
  const [selectedUser, setSelectedUser] = useState<UserRanking | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [myRankData, setMyRankData] = useState<MyRankData | null>(null);
  const [myRankLoading, setMyRankLoading] = useState(true);

  const fetchRankings = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50',
      });
      if (search) params.set('search', search);
      if (districtFilter) {
        params.set('district', districtFilter);
      } else if (regionFilter.startsWith('group:')) {
        params.set('regionGroup', regionFilter.slice(6));
      } else if (regionFilter) {
        params.set('region', regionFilter);
      }

      const res = await fetch(`/api/rankings?${params}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' },
      });
      const data = await res.json();

      if (!res.ok) {
        console.error('Rankings API error:', res.status, data);
        setFetchError(data?.error || 'Unable to load rankings');
        setUsers([]);
        setTotalUsers(0);
        setTotalPages(1);
        return;
      }

      setUsers(data.users || []);
      setTotalPages(data.pagination?.totalPages || 1);
      setTotalUsers(data.pagination?.total || 0);
      if (data.regions) setRegions(data.regions);
      if (data.regionGroups) setRegionGroups(data.regionGroups);
      if (Array.isArray(data.districts)) setDistricts(data.districts);
      if (data.districtMeta && typeof data.districtMeta.noDistrict === 'number') {
        setDistrictMeta({
          noDistrict: data.districtMeta.noDistrict,
          otherDistrict: data.districtMeta.otherDistrict ?? 0,
        });
      }
    } catch (error) {
      console.error('Failed to fetch rankings:', error);
      setFetchError('Network error. Pull down to retry.');
      setUsers([]);
      setTotalUsers(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [page, search, regionFilter, districtFilter]);

  useEffect(() => {
    fetchRankings();
  }, [fetchRankings]);

  useEffect(() => {
    if (!userTelegramInitData) {
      setMyRankData(null);
      setMyRankLoading(false);
      return;
    }
    setMyRankLoading(true);
    fetch(`/api/rankings/me?initData=${encodeURIComponent(userTelegramInitData)}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        if (data.rank != null && data.name) {
          setMyRankData({
            rank: data.rank,
            totalPlayers: data.totalPlayers ?? 0,
            name: data.name,
            points: data.points ?? 0,
            levelName: data.levelName ?? '—',
            gameLevelIndex: data.gameLevelIndex ?? 0,
          });
        } else {
          setMyRankData(null);
        }
      })
      .catch(() => setMyRankData(null))
      .finally(() => setMyRankLoading(false));
  }, [userTelegramInitData]);

  const handleClose = () => {
    triggerHapticFeedback(window);
    onClose();
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchRankings();
  };

  const formatNumber = (num: number): string => {
    if (num >= 1e12) return (num / 1e12).toFixed(1) + 'T';
    if (num >= 1e9) return (num / 1e9).toFixed(1) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
    return num.toString();
  };

  const getRankColor = (rank: number): string => {
    if (rank === 1) return 'text-[#f3ba2f]';
    if (rank === 2) return 'text-gray-300';
    if (rank === 3) return 'text-[#5eb3e8]';
    return 'text-white';
  };

  const getRankBadge = (rank: number): string => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  const groupByCountry = useMemo(() => {
    if (!regionFilter.startsWith('group:')) return null;
    const map = new Map<string, UserRanking[]>();
    for (const u of users) {
      const key = u.region || 'unknown';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(u);
    }
    const entries = Array.from(map.entries()).map(([code, list]) => ({
      code,
      name: list[0]?.regionName || code,
      users: list,
    }));
    entries.sort((a, b) => a.name.localeCompare(b.name));
    return entries;
  }, [users, regionFilter]);

  const renderUserRow = (user: UserRanking) => (
    <button
      key={user.id}
      onClick={() => setSelectedUser(user)}
      className="w-full p-4 flex items-center gap-3 hover:bg-ura-panel-2 transition-colors text-left"
    >
      <div className={`w-12 text-center font-bold shrink-0 ${getRankColor(user.rank)}`}>
        {getRankBadge(user.rank)}
      </div>
      <div className="p-1 rounded-lg bg-ura-panel-2 shrink-0">
        <Image
          src={LEVELS[calculateLevelIndex(user.points)].smallImage}
          width={28}
          height={28}
          alt=""
        />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-white truncate">{user.name}</span>
          {user.isPremium && (
            <span className="text-xs bg-blue-500 px-1.5 py-0.5 rounded text-white">Premium</span>
          )}
          {user.isFrozen && (
            <span className="text-xs bg-red-500 px-1.5 py-0.5 rounded text-white">Frozen</span>
          )}
        </div>
        <div className="text-sm text-gray-400 flex items-center gap-2 flex-wrap">
          {user.district ? (
            <span>{user.districtName && user.districtName !== 'Not set' ? user.districtName : user.district}</span>
          ) : (
            <span>{user.regionName}</span>
          )}
          <span className="text-gray-600">•</span>
          <span>{user.activitiesCompleted.tasks} tasks</span>
        </div>
      </div>
      <div className="text-right shrink-0">
        <div className="text-[#f3ba2f] font-bold">{formatNumber(user.points)}</div>
        <div className="text-xs text-gray-400">PEARLS</div>
      </div>
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-ura-page">
      {/* Header */}
      <div className="flex items-center justify-between bg-gradient-to-r from-ura-gold to-ura-gold-deep p-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <h1 className="min-w-0 flex-1 truncate pr-2 text-lg font-bold text-black sm:text-xl">Country Ranking</h1>
        <button
          onClick={handleClose}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ura-navy/20"
          aria-label="Close"
        >
          <Cross className="text-black" />
        </button>
      </div>

      {/* Stats Bar */}
      <div className="bg-ura-panel px-4 py-3 flex items-center justify-between border-b border-gray-700">
        <div className="text-sm text-gray-400">
          <span className="text-white font-bold">{formatNumber(totalUsers)}</span> Players
        </div>
        <div className="text-sm text-gray-400">
          <span className="text-white font-bold">{districts.length}</span> Districts
        </div>
      </div>

      {/* Search & Filter */}
      <div className="bg-ura-panel-2 p-4 space-y-3">
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text"
            placeholder="Search by name or Telegram ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-ura-panel text-white px-4 py-2 rounded-lg border border-gray-600 focus:border-[#f3ba2f] outline-none"
          />
          <button
            type="submit"
            className="bg-ura-gold text-black px-4 py-2 rounded-lg font-semibold"
          >
            Search
          </button>
        </form>

        <select
          value={
            districtFilter
              ? `district:${districtFilter}`
              : regionFilter
          }
          onChange={(e) => {
            const v = e.target.value;
            setPage(1);
            if (!v) {
              setDistrictFilter('');
              setRegionFilter('');
              return;
            }
            if (v.startsWith('district:')) {
              setRegionFilter('');
              setDistrictFilter(v.slice('district:'.length));
              return;
            }
            setDistrictFilter('');
            setRegionFilter(v);
          }}
          className="w-full bg-ura-panel text-white px-4 py-2 rounded-lg border border-gray-600 focus:border-[#f3ba2f] outline-none"
        >
          <option value="">All districts (all players)</option>
          <optgroup label="By district — participants">
            {districtMeta.noDistrict > 0 && (
              <option value={`district:${DISTRICT_FILTER_NONE}`}>
                No district assigned ({districtMeta.noDistrict})
              </option>
            )}
            {districts.map((d) => (
              <option key={d.slug} value={`district:${d.slug}`}>
                {d.name} ({d.count})
              </option>
            ))}
            {districtMeta.otherDistrict > 0 && (
              <option value={`district:${DISTRICT_FILTER_OTHER}`}>
                Other / not on list ({districtMeta.otherDistrict})
              </option>
            )}
          </optgroup>
          {regionGroups.length > 0 && (
            <>
              <optgroup label="By region (countries)">
                {regionGroups.map((g) => (
                  <option key={g.id} value={`group:${g.id}`}>
                    {g.name}
                  </option>
                ))}
              </optgroup>
              <optgroup label="By country">
                {regions.map((r) => (
                  <option key={r.code} value={r.code || ''}>
                    {r.name} ({r.count})
                  </option>
                ))}
              </optgroup>
            </>
          )}
          {regionGroups.length === 0 &&
            regions.map((r) => (
              <option key={r.code} value={r.code || ''}>
                {r.name} ({r.count})
              </option>
            ))}
        </select>
      </div>

      {/* Rankings List */}
      <div className="flex-1 overflow-y-auto bg-ura-panel">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-8 h-8 border-4 border-[#f3ba2f] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : fetchError ? (
          <div className="flex flex-col items-center justify-center h-40 px-4 text-center">
            <p className="text-red-400 mb-4">{fetchError}</p>
            <button
              onClick={() => fetchRankings()}
              className="bg-ura-gold text-black font-semibold px-6 py-2 rounded-lg"
            >
              Retry
            </button>
          </div>
        ) : users.length === 0 ? (
          <div className="flex items-center justify-center h-40 text-gray-400">
            No players found
          </div>
        ) : groupByCountry ? (
          <div className="divide-y divide-gray-700">
            {groupByCountry.map(({ name, users: countryUsers }) => (
              <div key={name}>
                <div className="sticky top-0 z-10 bg-[#25282d] px-4 py-2 border-b border-gray-700 text-sm font-semibold text-[#f3ba2f]">
                  {name} ({countryUsers.length})
                </div>
                <div className="divide-y divide-gray-700/50">
                  {countryUsers.map((user) => renderUserRow(user))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="divide-y divide-gray-700">
            {users.map((user) => renderUserRow(user))}
          </div>
        )}
      </div>

      {/* Your account — one row like leaderboard entries, fixed at bottom */}
      {(myRankLoading || myRankData) && (
        <div className="border-t border-gray-700 bg-[#2a2d33]">
          {myRankLoading ? (
            <div className="p-4 flex items-center gap-3 text-gray-500">
              <div className="w-6 h-6 border-2 border-[#f3ba2f] border-t-transparent rounded-full animate-spin" />
              <span>Loading your rank…</span>
            </div>
          ) : myRankData ? (
            <div className="p-4 flex items-center gap-3 text-left">
              {/* Rank */}
              <div className={`w-12 text-center font-bold shrink-0 ${getRankColor(myRankData.rank)}`}>
                {getRankBadge(myRankData.rank)}
              </div>

              {/* Level icon */}
              <div className="p-1 rounded-lg bg-ura-panel shrink-0">
                <Image
                  src={LEVELS[myRankData.gameLevelIndex]?.smallImage ?? LEVELS[0].smallImage}
                  width={28}
                  height={28}
                  alt=""
                />
              </div>

              {/* You + level name (same layout as list: name on top, subtitle below) */}
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-[#f3ba2f]">You</div>
                <div className="text-sm text-gray-400 truncate">{myRankData.levelName}</div>
              </div>

              {/* Points */}
              <div className="text-right shrink-0">
                <div className="text-[#f3ba2f] font-bold">{formatNumber(myRankData.points)}</div>
                <div className="text-xs text-gray-400">PEARLS</div>
              </div>
            </div>
          ) : (
            <div className="p-4 text-gray-500 text-sm">Sign in to see your rank</div>
          )}
        </div>
      )}

      {/* Pagination — arrows only, minimal height */}
      {totalPages > 1 && (
        <div className="bg-ura-panel-2 py-2 px-3 flex items-center justify-center gap-2">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="w-9 h-9 flex items-center justify-center bg-ura-panel text-white rounded-lg disabled:opacity-50 text-xl leading-none"
            aria-label="Previous page"
          >
            ←
          </button>
          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="w-9 h-9 flex items-center justify-center bg-ura-panel text-white rounded-lg disabled:opacity-50 text-xl leading-none"
            aria-label="Next page"
          >
            →
          </button>
        </div>
      )}

      {/* User Detail Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-60 flex items-end justify-center bg-ura-navy/80 p-0 sm:items-center sm:p-4">
          <div className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-ura-panel-2 sm:max-h-[80vh] sm:rounded-2xl">
            <div className="p-4 border-b border-gray-700 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                {selectedUser.name}
                {selectedUser.totalDonatedPoints > 0 && (
                  <span className="text-amber-400" title="Donor">⭐</span>
                )}
              </h2>
              <button
                onClick={() => setSelectedUser(null)}
                className="w-8 h-8 bg-ura-panel rounded-full flex items-center justify-center"
              >
                <Cross className="text-gray-400 w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-ura-panel p-3 rounded-lg">
                  <div className="text-xs text-gray-400">Rank</div>
                  <div className={`text-lg font-bold ${getRankColor(selectedUser.rank)}`}>
                    {getRankBadge(selectedUser.rank)}
                  </div>
                </div>
                <div className="bg-ura-panel p-3 rounded-lg">
                  <div className="text-xs text-gray-400">District</div>
                  <div className="text-lg font-bold text-white">
                    {selectedUser.district
                      ? selectedUser.districtName && selectedUser.districtName !== 'Not set'
                        ? selectedUser.districtName
                        : selectedUser.district
                      : '—'}
                  </div>
                </div>
                <div className="bg-ura-panel p-3 rounded-lg">
                  <div className="text-xs text-gray-400">Region</div>
                  <div className="text-lg font-bold text-white">{selectedUser.regionName}</div>
                </div>
                <div className="bg-ura-panel p-3 rounded-lg">
                  <div className="text-xs text-gray-400">Total Points</div>
                  <div className="text-lg font-bold text-[#f3ba2f]">
                    {formatNumber(selectedUser.points)} PEARLS
                  </div>
                </div>
                <div className="bg-ura-panel p-3 rounded-lg">
                  <div className="text-xs text-gray-400">Balance</div>
                  <div className="text-lg font-bold text-white">
                    {formatNumber(selectedUser.pointsBalance)} PEARLS
                  </div>
                </div>
              </div>

              {/* Status */}
              <div className="flex flex-wrap gap-2">
                {selectedUser.totalDonatedPoints > 0 && (
                  <span className="text-sm bg-amber-500/20 text-amber-400 px-2 py-1 rounded border border-amber-500/40">
                    ⭐ Donor
                  </span>
                )}
                {selectedUser.isPremium && (
                  <span className="text-sm bg-blue-500 px-2 py-1 rounded text-white">
                    Telegram Premium
                  </span>
                )}
                {selectedUser.isFrozen && (
                  <span className="text-sm bg-red-500 px-2 py-1 rounded text-white">
                    Account Frozen
                  </span>
                )}
              </div>

              {/* Activities */}
              <div>
                <h3 className="text-sm text-gray-400 mb-2">Activities Completed</h3>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-ura-panel p-3 rounded-lg flex justify-between">
                    <span className="text-gray-400">Tasks</span>
                    <span className="text-white font-bold">
                      {selectedUser.activitiesCompleted.tasks}
                    </span>
                  </div>
                  <div className="bg-ura-panel p-3 rounded-lg flex justify-between">
                    <span className="text-gray-400">Referrals</span>
                    <span className="text-white font-bold">
                      {selectedUser.activitiesCompleted.referrals}
                    </span>
                  </div>
                  <div className="bg-ura-panel p-3 rounded-lg flex justify-between">
                    <span className="text-gray-400">Decode</span>
                    <span className="text-white font-bold">
                      {selectedUser.activitiesCompleted.dailyCiphers}
                    </span>
                  </div>
                  <div className="bg-ura-panel p-3 rounded-lg flex justify-between">
                    <span className="text-gray-400">Matrix</span>
                    <span className="text-white font-bold">
                      {selectedUser.activitiesCompleted.dailyCombos}
                    </span>
                  </div>
                  <div className="bg-ura-panel p-3 rounded-lg flex justify-between">
                    <span className="text-gray-400">Cards</span>
                    <span className="text-white font-bold">
                      {selectedUser.activitiesCompleted.cardsCollected}
                    </span>
                  </div>
                  <div className="bg-ura-panel p-3 rounded-lg flex justify-between">
                    <span className="text-gray-400">Stakes</span>
                    <span className="text-white font-bold">
                      {selectedUser.activitiesCompleted.stakesCreated}
                    </span>
                  </div>
                </div>
              </div>

              {/* Upgrades */}
              <div>
                <h3 className="text-sm text-gray-400 mb-2">Upgrade Levels</h3>
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-ura-panel p-3 rounded-lg text-center">
                    <div className="text-xs text-gray-400">Multitap</div>
                    <div className="text-white font-bold">{selectedUser.multitapLevelIndex}</div>
                  </div>
                  <div className="bg-ura-panel p-3 rounded-lg text-center">
                    <div className="text-xs text-gray-400">Energy</div>
                    <div className="text-white font-bold">{selectedUser.energyLimitLevelIndex}</div>
                  </div>
                  <div className="bg-ura-panel p-3 rounded-lg text-center">
                    <div className="text-xs text-gray-400">Mine</div>
                    <div className="text-white font-bold">{selectedUser.mineLevelIndex}</div>
                  </div>
                </div>
              </div>

              {/* Referral Earnings */}
              <div className="bg-ura-panel p-3 rounded-lg">
                <div className="text-xs text-gray-400">Referral Earnings</div>
                <div className="text-lg font-bold text-green-400">
                  +{formatNumber(selectedUser.referralPointsEarned)} PEARLS
                </div>
              </div>

              {/* Donated to charity */}
              {selectedUser.totalDonatedPoints > 0 && (
                <div className="bg-ura-panel p-3 rounded-lg">
                  <div className="text-xs text-gray-400">Donated to charity</div>
                  <div className="text-lg font-bold text-amber-400">
                    {formatNumber(selectedUser.totalDonatedPoints)} PEARLS
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
