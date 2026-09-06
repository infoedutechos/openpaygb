"use client";

type Props = {
  collapsed: boolean;
  onToggle: () => void;
  className?: string;
  /** Match portal accent (cyan | emerald | amber | violet). */
  accent?: "cyan" | "emerald" | "amber" | "violet";
};

const accentBorder: Record<NonNullable<Props["accent"]>, string> = {
  cyan: "border-cyan-500/40 text-cyan-100 hover:bg-cyan-950/50",
  emerald: "border-emerald-500/40 text-emerald-100 hover:bg-emerald-950/50",
  amber: "border-amber-500/40 text-amber-100 hover:bg-amber-950/50",
  violet: "border-violet-500/40 text-violet-100 hover:bg-violet-950/50",
};

/** ◂ / ▸ control — collapse keeps icon rail visible. */
export function SidebarCollapseToggle({
  collapsed,
  onToggle,
  className = "",
  accent = "cyan",
}: Props) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border text-sm font-semibold transition ${accentBorder[accent]} ${className}`}
    >
      <span aria-hidden>{collapsed ? "▸" : "◂"}</span>
    </button>
  );
}
