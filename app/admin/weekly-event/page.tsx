// app/admin/weekly-event/page.tsx

/**
 * Admin page for Weekly Event (Hybrid - override tiers per week)
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useToast } from '@/contexts/ToastContext';

interface TierOverride {
  taps: number;
  tasks: number;
  reward: number;
  referrals?: number; // new referrals this week only (level 1 = 1, level 2 = 2, ..., level 16 = 16; +1 per level)
}

interface OverrideRecord {
  id: string;
  weekKey: string;
  tiers: TierOverride[];
}

export default function AdminWeeklyEvent() {
  const showToast = useToast();
  const [overrides, setOverrides] = useState<OverrideRecord[]>([]);
  const [currentWeek, setCurrentWeek] = useState('');
  const [weekKey, setWeekKey] = useState('');
  const [tiersJson, setTiersJson] = useState(`[
  { "taps": 5000, "tasks": 2, "referrals": 1, "reward": 100000 },
  { "taps": 15000, "tasks": 5, "referrals": 2, "reward": 150000 },
  { "taps": 25000, "tasks": 8, "referrals": 3, "reward": 250000 },
  { "taps": 40000, "tasks": 10, "referrals": 4, "reward": 400000 },
  { "taps": 60000, "tasks": 12, "referrals": 5, "reward": 600000 },
  { "taps": 85000, "tasks": 14, "referrals": 6, "reward": 850000 },
  { "taps": 115000, "tasks": 16, "referrals": 7, "reward": 1150000 },
  { "taps": 150000, "tasks": 18, "referrals": 8, "reward": 1500000 },
  { "taps": 190000, "tasks": 20, "referrals": 9, "reward": 1900000 },
  { "taps": 235000, "tasks": 22, "referrals": 10, "reward": 2350000 },
  { "taps": 285000, "tasks": 24, "referrals": 11, "reward": 2850000 },
  { "taps": 340000, "tasks": 26, "referrals": 12, "reward": 3400000 },
  { "taps": 400000, "tasks": 28, "referrals": 13, "reward": 4000000 },
  { "taps": 465000, "tasks": 30, "referrals": 14, "reward": 4650000 },
  { "taps": 535000, "tasks": 32, "referrals": 15, "reward": 5350000 },
  { "taps": 610000, "tasks": 34, "referrals": 16, "reward": 6100000 }
]`);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/weekly-event');
      if (res.ok) {
        const data = await res.json();
        setOverrides(data.overrides ?? []);
        setCurrentWeek(data.currentWeek ?? '');
      }
    } catch {
      showToast('Failed to load', 'error');
    }
  }, [showToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSetOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    const w = weekKey.trim() || currentWeek;
    if (!w) {
      showToast('Week key required', 'error');
      return;
    }
    let tiers: TierOverride[];
    try {
      tiers = JSON.parse(tiersJson);
      if (!Array.isArray(tiers) || tiers.some((t) => typeof t.taps !== 'number' || typeof t.tasks !== 'number' || typeof t.reward !== 'number' || (t.referrals != null && typeof t.referrals !== 'number'))) {
        throw new Error('Invalid tiers format');
      }
    } catch {
      showToast('Invalid JSON - each tier needs taps, tasks, reward (numbers); referrals optional', 'error');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/admin/weekly-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weekKey: w, tiers }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      showToast('Override saved', 'success');
      setWeekKey('');
      fetchData();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-ura-panel text-white p-8">
      <div className="max-w-2xl">
        <Link href="/admin" className="text-[#f3ba2f] mb-4 inline-block">← Back to Admin</Link>
        <h1 className="text-2xl font-bold mb-6">Weekly Event Override</h1>
        <p className="text-gray-400 mb-6">Current week: {currentWeek || '—'}</p>

        <form onSubmit={handleSetOverride} className="space-y-4 mb-8">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Week key (e.g. 2025-W05)</label>
            <input
              type="text"
              value={weekKey}
              onChange={(e) => setWeekKey(e.target.value)}
              placeholder={currentWeek}
              className="w-full bg-ura-panel-2 rounded-lg px-4 py-2 text-white"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Tiers JSON</label>
            <textarea
              value={tiersJson}
              onChange={(e) => setTiersJson(e.target.value)}
              rows={10}
              className="w-full bg-ura-panel-2 rounded-lg px-4 py-2 text-white font-mono text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 bg-ura-gold text-black rounded-lg font-bold disabled:opacity-50"
          >
            {isSubmitting ? 'Saving...' : 'Save Override'}
          </button>
        </form>

        <h2 className="text-lg font-bold mb-2">Overrides</h2>
        <p className="text-gray-400 text-sm mb-2">Tiers show taps, tasks, referrals (new refs this week), reward. Level 1 = 1 ref, level 2 = 2 refs, … level 16 = 16 refs. Missing referrals default to 1, 2, … 16 in the API.</p>
        <div className="space-y-2">
          {overrides.map((o) => {
            const tiersWithRefs = (o.tiers as TierOverride[]).map((t, i) => ({
              ...t,
              referrals: t.referrals ?? i + 1,
            }));
            return (
              <div key={o.id} className="bg-ura-panel-2 rounded-lg p-4">
                <p className="font-bold">{o.weekKey}</p>
                <pre className="text-sm text-gray-400 mt-1 overflow-x-auto">
                  {JSON.stringify(tiersWithRefs, null, 2)}
                </pre>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
