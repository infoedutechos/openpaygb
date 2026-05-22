'use client';

import type { CSSProperties } from 'react';
import type { EcosystemAccent, EcosystemDashboardModule } from './types';

const ACCENT_STYLES: Record<
  EcosystemAccent,
  { border: string; glow: string; iconBg: string; activeRing: string }
> = {
  gold: {
    border: 'border-amber-400/40',
    glow: 'shadow-[0_0_20px_rgba(251,191,36,0.25)]',
    iconBg: 'bg-amber-500/15 text-amber-200',
    activeRing: 'focus-visible:ring-amber-400/80',
  },
  blue: {
    border: 'border-sky-400/40',
    glow: 'shadow-[0_0_20px_rgba(56,189,248,0.25)]',
    iconBg: 'bg-sky-500/15 text-sky-200',
    activeRing: 'focus-visible:ring-sky-400/80',
  },
  purple: {
    border: 'border-violet-400/40',
    glow: 'shadow-[0_0_20px_rgba(167,139,250,0.25)]',
    iconBg: 'bg-violet-500/15 text-violet-200',
    activeRing: 'focus-visible:ring-violet-400/80',
  },
  emerald: {
    border: 'border-emerald-400/40',
    glow: 'shadow-[0_0_20px_rgba(52,211,153,0.25)]',
    iconBg: 'bg-emerald-500/15 text-emerald-200',
    activeRing: 'focus-visible:ring-emerald-400/80',
  },
};

type Props = {
  module: EcosystemDashboardModule;
  index: number;
  accent: EcosystemAccent;
  isActive?: boolean;
  style?: CSSProperties;
  className?: string;
  onActivate: () => void;
};

export default function ModuleCard({
  module,
  index,
  accent,
  isActive,
  style,
  className = '',
  onActivate,
}: Props) {
  const a = ACCENT_STYLES[accent];
  const n = String(index + 1).padStart(2, '0');

  return (
    <button
      type="button"
      style={style}
      onClick={onActivate}
      aria-label={`${module.title}. ${module.subtitle}`}
      className={[
        'ecosystem-module-tap absolute z-20 flex min-h-[4.5rem] w-[4.75rem] sm:w-[5.25rem] flex-col items-center justify-center gap-0.5 rounded-2xl border px-1.5 py-2 text-center',
        'bg-white/[0.06] backdrop-blur-md transition-transform duration-200 ease-out',
        'hover:z-30 hover:scale-110 hover:brightness-110',
        'active:scale-[0.97]',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050814]',
        a.border,
        a.glow,
        a.activeRing,
        isActive ? 'ring-2 ring-[#f3ba2f] ring-offset-1 ring-offset-[#050814] brightness-110' : '',
        className,
      ].join(' ')}
    >
      <span className="text-[9px] font-bold tabular-nums text-white/50">{n}</span>
      <span
        className={`flex h-8 w-8 items-center justify-center rounded-xl text-base ${a.iconBg}`}
        aria-hidden
      >
        {module.icon}
      </span>
      <span className="line-clamp-2 max-h-8 text-[8px] font-bold uppercase leading-tight tracking-wide text-white/95">
        {module.title}
      </span>
    </button>
  );
}
