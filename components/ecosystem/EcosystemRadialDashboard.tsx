'use client';

import { useState } from 'react';
import RadialMenu from './RadialMenu';
import BottomNav from './BottomNav';
import RoleFilterTabs from './RoleFilterTabs';
import type { EcosystemBottomNavKey, EcosystemDashboardModule } from './types';

type Role = 'Citizens' | 'Students' | 'Businesses' | 'Creators' | 'Communities';

type Props = {
  modules: EcosystemDashboardModule[];
  onHaptic?: () => void;
  onBottomNav?: (key: EcosystemBottomNavKey) => void;
  initialBottomNav?: EcosystemBottomNavKey | null;
};

function EcosystemAnimatedBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl" aria-hidden>
      <div
        className="absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(95, 185, 255, 0.06) 1px, transparent 1px),
            linear-gradient(90deg, rgba(95, 185, 255, 0.06) 1px, transparent 1px)
          `,
          backgroundSize: '24px 24px',
        }}
      />
      <div className="absolute -left-1/4 top-0 h-[60%] w-[70%] rounded-full bg-violet-600/10 blur-3xl" />
      <div className="absolute -right-1/4 bottom-0 h-[50%] w-[60%] rounded-full bg-cyan-600/10 blur-3xl" />
      <div className="absolute left-1/2 top-1/2 h-[40%] w-[40%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-500/5 blur-2xl" />
      {/* subtle drifting particles */}
      {[0, 1, 2, 3, 4].map((i) => (
        <span
          key={i}
          className="absolute h-1 w-1 rounded-full bg-sky-300/40 shadow-[0_0_6px_rgba(125,211,252,0.8)] ecosystem-particle"
          style={{
            left: `${18 + i * 17}%`,
            top: `${12 + (i % 3) * 22}%`,
            animationDelay: `${i * 0.7}s`,
          }}
        />
      ))}
    </div>
  );
}

export default function EcosystemRadialDashboard({
  modules,
  onHaptic,
  onBottomNav,
  initialBottomNav = null,
}: Props) {
  const [role, setRole] = useState<Role>('Citizens');
  const [bottomActive, setBottomActive] = useState<EcosystemBottomNavKey | null>(initialBottomNav);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-cyan-500/20 bg-[#050814] shadow-[0_0_40px_rgba(56,189,248,0.12)]">
      <EcosystemAnimatedBackdrop />
      <div className="relative z-10 px-2 pb-2 pt-3">
        <header className="mb-2 text-center">
          <h2 className="text-[10px] font-bold uppercase tracking-[0.28em] text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-sky-300 to-violet-300">
            URA Civilizational Ecosystem
          </h2>
          <p className="mt-0.5 text-[9px] text-white/45">Tap a module · Neon radial command</p>
        </header>

        <RoleFilterTabs activeRole={role} onRoleChange={setRole} />

        <RadialMenu
          modules={modules}
          onModuleActivate={(m) => {
            onHaptic?.();
            m.onClick();
          }}
        />

        <BottomNav
          activeKey={bottomActive}
          onSelect={(key) => {
            onHaptic?.();
            setBottomActive(key);
            onBottomNav?.(key);
          }}
        />
      </div>
    </div>
  );
}
