"use client";

import type { MasterOrgRow } from "@/components/admin/master-org/types";

type Props = {
  org: MasterOrgRow;
  value: string;
  busy: boolean;
  compact?: boolean;
  onChange: (v: string) => void;
  onSave: () => void;
};

export function MasterOrgWalletField({ org, value, busy, compact, onChange, onSave }: Props) {
  const inputClass = compact
    ? "mt-1 w-full rounded-lg border border-[var(--border)] bg-[#0d1526] px-3 py-2 font-mono text-xs text-white"
    : "w-full min-w-0 rounded border border-[var(--border)] bg-[#0d1526] px-2 py-1 font-mono text-[10px] text-white";
  const btnClass = compact
    ? "mt-2 min-h-[44px] rounded-lg border border-cyan-500/40 bg-cyan-950/40 px-3 py-2 text-xs font-semibold text-cyan-100 disabled:opacity-50"
    : "rounded border border-cyan-500/40 bg-cyan-950/40 px-2 py-0.5 text-[11px] font-semibold text-cyan-100 hover:bg-cyan-900/50 disabled:opacity-50";

  const inner = (
    <>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="EQ… / UQ… (empty = env)"
        className={inputClass}
        aria-label={`TON destination wallet for ${org.slug}`}
      />
      <button type="button" disabled={busy} onClick={onSave} className={btnClass}>
        {busy ? (compact ? "Saving…" : "…") : "Save wallet"}
      </button>
    </>
  );

  if (compact) {
    return (
      <label className="mt-4 block">
        <span className="text-[11px] font-medium text-slate-500">TON treasury</span>
        {inner}
      </label>
    );
  }

  return <div className="flex flex-col gap-1">{inner}</div>;
}
