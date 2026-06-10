"use client";

import type { MasterOrgRow } from "@/components/admin/master-org/types";

type Props = {
  org: MasterOrgRow;
  fxKind: string;
  fxUgx: string;
  fxBuffer: string;
  busy: boolean;
  compact?: boolean;
  onFxKindChange: (v: string) => void;
  onFxUgxChange: (v: string) => void;
  onFxBufferChange: (v: string) => void;
  onSave: () => void;
};

export function MasterOrgFxField({
  org,
  fxKind,
  fxUgx,
  fxBuffer,
  busy,
  compact,
  onFxKindChange,
  onFxUgxChange,
  onFxBufferChange,
  onSave,
}: Props) {
  const selectClass = compact
    ? "w-full rounded-lg border border-[var(--border)] bg-[#0d1526] px-3 py-2 text-sm text-white"
    : "w-full min-w-0 rounded border border-[var(--border)] bg-[#0d1526] px-2 py-1 text-[11px] text-white";
  const inputClass = compact
    ? "w-full rounded-lg border border-[var(--border)] bg-[#0d1526] px-3 py-2 font-mono text-sm text-white"
    : "w-full min-w-0 rounded border border-[var(--border)] bg-[#0d1526] px-2 py-1 font-mono text-[10px] text-white";
  const btnClass = compact
    ? "min-h-[44px] w-full rounded-lg border border-cyan-500/40 bg-cyan-950/40 px-3 py-2 text-xs font-semibold text-cyan-100 disabled:opacity-50"
    : "rounded border border-cyan-500/40 bg-cyan-950/40 px-2 py-0.5 text-[11px] font-semibold text-cyan-100 hover:bg-cyan-900/50 disabled:opacity-50";

  const inner = (
    <>
      <select
        value={fxKind}
        onChange={(e) => onFxKindChange(e.target.value)}
        className={selectClass}
        aria-label={`FX override kind for ${org.slug}`}
      >
        <option value="inherit">inherit</option>
        <option value="none">none</option>
        <option value="fixed">fixed</option>
        <option value="buffer_pct">buffer %</option>
      </select>
      {fxKind === "fixed" ? (
        <input
          type="number"
          min={1}
          step={1}
          value={fxUgx}
          onChange={(e) => onFxUgxChange(e.target.value)}
          placeholder="UGX / TON"
          className={inputClass}
        />
      ) : null}
      {fxKind === "buffer_pct" ? (
        <input
          type="number"
          step={0.1}
          value={fxBuffer}
          onChange={(e) => onFxBufferChange(e.target.value)}
          placeholder="Buffer %"
          className={inputClass}
        />
      ) : null}
      <button type="button" disabled={busy} onClick={onSave} className={btnClass}>
        {busy ? (compact ? "Saving…" : "…") : "Save FX"}
      </button>
    </>
  );

  if (compact) {
    return (
      <div className="mt-4 space-y-2">
        <span className="text-[11px] font-medium text-slate-500">FX override</span>
        {inner}
      </div>
    );
  }

  return <div className="flex flex-col gap-1">{inner}</div>;
}
