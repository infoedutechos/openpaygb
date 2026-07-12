"use client";

type Slice = { label: string; value: number; color: string };

export function SchoolPieChart({ slices, size = 96 }: { slices: Slice[]; size?: number }) {
  const total = slices.reduce((s, x) => s + x.value, 0);
  if (total <= 0) {
    return (
      <div
        className="rounded-full bg-white/10"
        style={{ width: size, height: size }}
        aria-hidden
      />
    );
  }

  let cursor = 0;
  const stops = slices
    .filter((s) => s.value > 0)
    .map((s) => {
      const pct = (s.value / total) * 100;
      const start = cursor;
      cursor += pct;
      return `${s.color} ${start}% ${cursor}%`;
    })
    .join(", ");

  return (
    <div className="flex items-center gap-3">
      <div
        className="shrink-0 rounded-full"
        style={{ width: size, height: size, background: `conic-gradient(${stops})` }}
        aria-hidden
      />
      <ul className="space-y-0.5 text-xs text-slate-400">
        {slices.map((s) => (
          <li key={s.label} className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: s.color }} />
            {s.label}: {Math.round((s.value / total) * 100)}%
          </li>
        ))}
      </ul>
    </div>
  );
}
