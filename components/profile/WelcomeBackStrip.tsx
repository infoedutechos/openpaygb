"use client";

import { buildWelcomeBackMessage, type UserRoleLabel } from "@/lib/welcome-back";

type Props = {
  name: string;
  role: UserRoleLabel;
  previousLoginAt?: string | null;
  className?: string;
};

export function WelcomeBackStrip({ name, role, previousLoginAt, className = "" }: Props) {
  const { headline, subline } = buildWelcomeBackMessage({
    name,
    role,
    previousLoginAt,
    isFirstLogin: !previousLoginAt,
  });

  return (
    <div className={`rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 ${className}`}>
      <p className="truncate text-sm font-medium text-white" title={headline}>
        {headline}
      </p>
      <p className="truncate text-[11px] text-slate-500" title={subline}>
        {subline}
      </p>
    </div>
  );
}
