"use client";

export type VoucherLine = { particular: string; amountUgx: number };

export function SchoolVoucherLineItems({
  lines,
  onChange,
}: {
  lines: VoucherLine[];
  onChange: (lines: VoucherLine[]) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-400">Line items</p>
      {lines.map((line, i) => (
        <div key={i} className="flex gap-2">
          <input
            value={line.particular}
            onChange={(e) => {
              const next = [...lines];
              next[i] = { ...next[i], particular: e.target.value };
              onChange(next);
            }}
            placeholder="Particulars"
            className="flex-1 rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white"
          />
          <input
            type="number"
            min={0}
            value={line.amountUgx || ""}
            onChange={(e) => {
              const next = [...lines];
              next[i] = { ...next[i], amountUgx: Number(e.target.value) };
              onChange(next);
            }}
            placeholder="UGX"
            className="w-28 rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white"
          />
          <button
            type="button"
            onClick={() => onChange(lines.filter((_, j) => j !== i))}
            className="text-xs text-rose-400 px-2"
          >
            ✕
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...lines, { particular: "", amountUgx: 0 }])}
        className="text-xs text-cyan-300"
      >
        + Add line
      </button>
    </div>
  );
}
