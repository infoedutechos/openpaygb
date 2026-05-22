'use client';

import { useMemo, useState } from 'react';
import ModuleCard from './ModuleCard';
import CenterHub from './CenterHub';
import type { EcosystemAccent, EcosystemDashboardModule } from './types';

const ACCENTS: EcosystemAccent[] = ['gold', 'blue', 'purple', 'emerald'];

type Props = {
  modules: EcosystemDashboardModule[];
  onModuleActivate: (module: EcosystemDashboardModule) => void;
  /** Ring radius as % from center (node center positions) */
  ringRadiusPct?: number;
};

export default function RadialMenu({ modules, onModuleActivate, ringRadiusPct = 40 }: Props) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const n = modules.length;

  const positions = useMemo(() => {
    return modules.map((_, idx) => {
      const angleDeg = -90 + (idx * 360) / n;
      const angle = (angleDeg * Math.PI) / 180;
      const r = ringRadiusPct;
      return {
        left: 50 + r * Math.cos(angle),
        top: 50 + r * Math.sin(angle),
      };
    });
  }, [modules, n, ringRadiusPct]);

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[min(100%,360px)]">
      <CenterHub />
      {modules.map((mod, idx) => {
        const pos = positions[idx];
        const accent = ACCENTS[idx % ACCENTS.length];
        return (
          <ModuleCard
            key={mod.id}
            module={mod}
            index={idx}
            accent={accent}
            isActive={activeId === mod.id}
            style={{
              left: `${pos.left}%`,
              top: `${pos.top}%`,
              transform: 'translate(-50%, -50%)',
            }}
            onActivate={() => {
              setActiveId(mod.id);
              onModuleActivate(mod);
              window.setTimeout(() => setActiveId(null), 320);
            }}
          />
        );
      })}
    </div>
  );
}
