'use client';

const ROLES = ['Citizens', 'Students', 'Businesses', 'Creators', 'Communities'] as const;

type Role = (typeof ROLES)[number];

type Props = {
  activeRole: Role;
  onRoleChange: (role: Role) => void;
};

export default function RoleFilterTabs({ activeRole, onRoleChange }: Props) {
  return (
    <div className="mb-2 px-0.5">
      <p className="mb-1 text-center text-[8px] font-semibold uppercase tracking-[0.18em] text-cyan-300/70">
        Role-aware · Citizen-first
      </p>
      <div
        className="flex gap-1 overflow-x-auto pb-1 no-scrollbar"
        role="tablist"
        aria-label="Audience roles"
      >
        {ROLES.map((role) => {
          const active = activeRole === role;
          return (
            <button
              key={role}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onRoleChange(role)}
              className={[
                'flex-shrink-0 rounded-full border px-2.5 py-1 text-[9px] font-semibold transition-all duration-200',
                active
                  ? 'border-[#f3ba2f]/60 bg-ura-gold/15 text-[#f3ba2f] shadow-[0_0_12px_rgba(243,186,47,0.2)]'
                  : 'border-white/15 bg-white/[0.04] text-white/60 hover:border-cyan-400/30 hover:text-white',
              ].join(' ')}
            >
              {role}
            </button>
          );
        })}
      </div>
    </div>
  );
}
