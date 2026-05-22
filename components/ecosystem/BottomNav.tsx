'use client';

import type { EcosystemBottomNavKey } from './types';

const ITEMS: { key: EcosystemBottomNavKey; label: string; icon: string }[] = [
  { key: 'learn', label: 'Learn', icon: '📚' },
  { key: 'engage', label: 'Engage', icon: '🤝' },
  { key: 'earn', label: 'Earn', icon: '💠' },
  { key: 'empower', label: 'Empower', icon: '⚡' },
  { key: 'elevate', label: 'Elevate', icon: '📈' },
];

type Props = {
  activeKey?: EcosystemBottomNavKey | null;
  onSelect: (key: EcosystemBottomNavKey) => void;
};

export default function BottomNav({ activeKey, onSelect }: Props) {
  return (
    <div className="mt-3 px-1">
      <p className="mb-1.5 text-center text-[8px] font-semibold uppercase tracking-[0.2em] text-violet-300/80">
        One ecosystem · Endless impact
      </p>
      <nav
        className="flex items-stretch justify-between gap-1 rounded-2xl border border-white/10 bg-white/[0.04] p-1.5 backdrop-blur-md"
        aria-label="Ecosystem categories"
      >
        {ITEMS.map(({ key, label, icon }) => {
          const active = activeKey === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelect(key)}
              aria-label={label}
              aria-current={active ? 'true' : undefined}
              className={[
                'flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-xl py-1.5 text-[8px] font-bold uppercase tracking-wide transition-all duration-200',
                active
                  ? 'bg-gradient-to-b from-violet-600/50 to-indigo-900/60 text-white shadow-[0_0_16px_rgba(139,92,246,0.35)]'
                  : 'text-white/55 hover:bg-white/10 hover:text-white',
              ].join(' ')}
            >
              <span className="text-sm" aria-hidden>
                {icon}
              </span>
              <span className="truncate px-0.5">{label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
