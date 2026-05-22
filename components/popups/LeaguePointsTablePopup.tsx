'use client';

import React from 'react';
import { triggerHapticFeedback } from '@/utils/ui';
import { LEAGUE_POINTS, LEAGUE_POINTS_MULTIPLIER } from '@/utils/consts';

const ROWS: { activity: string; points: number; key: keyof typeof LEAGUE_POINTS }[] = [
  { activity: 'Daily Login', points: LEAGUE_POINTS.dailyLogin, key: 'dailyLogin' },
  { activity: 'Complete Task', points: LEAGUE_POINTS.taskComplete, key: 'taskComplete' },
  { activity: 'Attend X-Space', points: LEAGUE_POINTS.attendEvent, key: 'attendEvent' },
  { activity: 'Referral', points: LEAGUE_POINTS.referral, key: 'referral' },
  { activity: 'Win Challenge', points: LEAGUE_POINTS.miniGameWin, key: 'miniGameWin' },
  { activity: 'Streak Bonus', points: LEAGUE_POINTS.streakPerDay, key: 'streakPerDay' },
];

interface LeaguePointsTablePopupProps {
  onClose: () => void;
}

export default function LeaguePointsTablePopup({ onClose }: LeaguePointsTablePopupProps) {
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-ura-navy/60 p-0 sm:items-center sm:p-4">
      <div className="max-h-[90dvh] w-full max-w-xl flex flex-col overflow-hidden animate-slide-up rounded-t-3xl bg-ura-panel shadow-xl sm:max-h-[85vh] sm:animate-none sm:rounded-2xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-ura-border/75 shrink-0">
          <h2 className="text-lg font-bold text-white">Team Points (TP) &amp; League Points (LP)</h2>
          <button
            type="button"
            onClick={() => { triggerHapticFeedback(window); onClose(); }}
            className="p-2 rounded-full text-gray-400 hover:text-white text-2xl"
            aria-label="Close"
          >
            &times;
          </button>
        </div>
        <div className="p-4 overflow-y-auto space-y-6">
          <p className="text-gray-400 text-sm">
            Users in a <strong className="text-white">team</strong> earn <strong className="text-sky-300">TP</strong>. Users in a <strong className="text-white">league</strong> (team under a league) earn the same <strong className="text-sky-300">TP</strong> plus <strong className="text-[#f3ba2f]">LP</strong> ({LEAGUE_POINTS_MULTIPLIER}×). So league members get extra benefits.
          </p>

          <div>
            <h3 className="text-sky-300 font-semibold text-sm mb-2">Team activities (TP only)</h3>
            <p className="text-gray-500 text-xs mb-2">If you are in a team but not in a league, you earn only TP.</p>
            <div className="rounded-xl border border-ura-border/75 overflow-hidden">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-ura-panel-2 border-b border-ura-border/75">
                    <th className="py-3 px-4 text-sm font-semibold text-white">Activity</th>
                    <th className="py-3 px-4 text-sm font-semibold text-right text-sky-300">TP</th>
                  </tr>
                </thead>
                <tbody>
                  {ROWS.map((row) => (
                    <tr key={row.key} className="border-b border-ura-border/85 last:border-b-0">
                      <td className="py-3 px-4 text-white text-sm">{row.activity}</td>
                      <td className="py-3 px-4 text-right text-sm font-medium text-sky-300">
                        {row.key === 'streakPerDay' ? `+${row.points}/day` : `+${row.points}`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h3 className="text-[#f3ba2f] font-semibold text-sm mb-2">League activities (TP + LP)</h3>
            <p className="text-gray-500 text-xs mb-2">If you are in a league (your team joined a league), you earn TP and LP ({LEAGUE_POINTS_MULTIPLIER}× base as LP).</p>
            <div className="rounded-xl border border-ura-border/75 overflow-hidden">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-ura-panel-2 border-b border-ura-border/75">
                    <th className="py-3 px-4 text-sm font-semibold text-white">Activity</th>
                    <th className="py-3 px-4 text-sm font-semibold text-right text-[#f3ba2f]">TP + LP</th>
                  </tr>
                </thead>
                <tbody>
                  {ROWS.map((row) => (
                    <tr key={row.key} className="border-b border-ura-border/85 last:border-b-0">
                      <td className="py-3 px-4 text-white text-sm">{row.activity}</td>
                      <td className="py-3 px-4 text-right text-sm font-medium text-[#f3ba2f]">
                        {row.key === 'streakPerDay'
                          ? `+${row.points} TP + ${row.points * LEAGUE_POINTS_MULTIPLIER} LP/day`
                          : `+${row.points} TP + ${row.points * LEAGUE_POINTS_MULTIPLIER} LP`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
