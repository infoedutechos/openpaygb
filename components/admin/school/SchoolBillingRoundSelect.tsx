"use client";

import {
  SCHOOL_BILLING_ROUNDS,
  type SchoolBillingRound,
} from "@/lib/school-billing-rounds";

type Props = {
  value: SchoolBillingRound;
  onChange: (value: SchoolBillingRound) => void;
  className?: string;
};

export function SchoolBillingRoundSelect({ value, onChange, className = "" }: Props) {
  const hint = SCHOOL_BILLING_ROUNDS.find((r) => r.value === value)?.hint;
  return (
    <div className={className}>
      <label className="flex flex-col gap-1 text-sm text-slate-300">
        <span className="font-medium text-slate-200">Set rounds</span>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value as SchoolBillingRound)}
          className="rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white"
        >
          {SCHOOL_BILLING_ROUNDS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </label>
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}
