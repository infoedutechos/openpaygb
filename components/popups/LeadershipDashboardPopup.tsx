'use client';

/**
 * Leadership dashboard – lists teams and leagues the user owns.
 * Tap a team or league to open its full-screen management dashboard (members, communicate, opinions).
 */

import React from 'react';
import { triggerHapticFeedback } from '@/utils/ui';
import TeamManagementDashboardPopup from './TeamManagementDashboardPopup';
import LeagueManagementDashboardPopup from './LeagueManagementDashboardPopup';

export interface LeadershipDashboardPopupProps {
  onClose: () => void;
  initData: string;
  ownedTeams: Array<{ id: string; name: string }>;
  ownedLeagues: Array<{ id: string; name: string }>;
  onSuccess?: () => void;
}

type OpenManage = { type: 'team'; teamId: string; teamName: string } | { type: 'league'; leagueId: string; leagueName: string } | null;

export default function LeadershipDashboardPopup({
  onClose,
  initData,
  ownedTeams,
  ownedLeagues,
  onSuccess,
}: LeadershipDashboardPopupProps) {
  const [openManage, setOpenManage] = React.useState<OpenManage>(null);

  if (openManage?.type === 'team') {
    return (
      <TeamManagementDashboardPopup
        teamId={openManage.teamId}
        teamName={openManage.teamName}
        onClose={() => setOpenManage(null)}
        initData={initData}
        onSuccess={() => { onSuccess?.(); setOpenManage(null); }}
      />
    );
  }

  if (openManage?.type === 'league') {
    return (
      <LeagueManagementDashboardPopup
        leagueId={openManage.leagueId}
        leagueName={openManage.leagueName}
        onClose={() => setOpenManage(null)}
        initData={initData}
        onSuccess={() => { onSuccess?.(); setOpenManage(null); }}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-ura-navy-deep/90 min-h-[100dvh]">
      <header className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-ura-border/85 bg-ura-panel-2">
        <div>
          <h1 className="text-lg font-bold text-white">Leadership</h1>
          <p className="text-xs text-gray-400">Manage your teams and leagues</p>
        </div>
        <button
          type="button"
          onClick={() => { triggerHapticFeedback(window); onClose(); }}
          className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-ura-panel-2"
        >
          <span className="text-2xl">&times;</span>
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {ownedTeams.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Team management</h2>
            <p className="text-xs text-gray-500 mb-3">Tap to open the full management dashboard: members, announcements, opinions.</p>
            <ul className="space-y-2">
              {ownedTeams.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => { triggerHapticFeedback(window); setOpenManage({ type: 'team', teamId: t.id, teamName: t.name }); }}
                    className="w-full flex items-center justify-between p-4 rounded-xl bg-ura-panel-2 border border-ura-border/85 hover:border-sky-500/50 text-left transition-colors"
                  >
                    <span className="text-2xl">👥</span>
                    <div className="min-w-0 flex-1 mx-3">
                      <p className="font-medium text-white">{t.name}</p>
                      <p className="text-xs text-gray-400">Team · Manage members, communicate, raise opinions</p>
                    </div>
                    <span className="text-sky-400">Open →</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {ownedLeagues.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">League management</h2>
            <p className="text-xs text-gray-500 mb-3">Tap to open the full management dashboard: members, announcements, opinions.</p>
            <ul className="space-y-2">
              {ownedLeagues.map((l) => (
                <li key={l.id}>
                  <button
                    type="button"
                    onClick={() => { triggerHapticFeedback(window); setOpenManage({ type: 'league', leagueId: l.id, leagueName: l.name }); }}
                    className="w-full flex items-center justify-between p-4 rounded-xl bg-ura-panel-2 border border-ura-border/85 hover:border-amber-500/50 text-left transition-colors"
                  >
                    <span className="text-2xl">🏆</span>
                    <div className="min-w-0 flex-1 mx-3">
                      <p className="font-medium text-white">{l.name}</p>
                      <p className="text-xs text-gray-400">League · Manage members, communicate, raise opinions</p>
                    </div>
                    <span className="text-amber-400">Open →</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {ownedTeams.length === 0 && ownedLeagues.length === 0 && (
          <p className="text-gray-500 text-center py-8">You don’t own any team or league yet. Create a team or league to see management here.</p>
        )}
      </div>
    </div>
  );
}
