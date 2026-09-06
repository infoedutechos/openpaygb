"use client";

import Link from "next/link";
import { SidebarNavIcon, type SidebarIconId } from "@/components/nav/sidebar-nav-icons";
import { useSidebarNavIconOverrides } from "@/hooks/useSidebarNavIconOverrides";

type Props = {
  href: string;
  label: string;
  /** Stable key for MAC icon overrides, e.g. school.students */
  navKey?: string;
  /** Default builtin icon when no MAC override. */
  iconId?: SidebarIconId | string;
  /** Optional secondary line when expanded (master console). */
  subtitle?: string;
  active?: boolean;
  collapsed: boolean;
  accent?: "cyan" | "emerald" | "amber" | "violet";
  onClick?: () => void;
};

const activeClass: Record<NonNullable<Props["accent"]>, string> = {
  cyan: "bg-cyan-500/15 font-medium text-cyan-100",
  emerald: "bg-emerald-500/15 font-medium text-emerald-100",
  amber: "bg-amber-500/15 font-medium text-amber-100",
  violet: "bg-violet-500/15 font-medium text-violet-100",
};

const iconActive: Record<NonNullable<Props["accent"]>, string> = {
  cyan: "bg-cyan-500/25 text-cyan-100 ring-1 ring-cyan-400/40",
  emerald: "bg-emerald-500/25 text-emerald-100 ring-1 ring-emerald-400/40",
  amber: "bg-amber-500/25 text-amber-100 ring-1 ring-amber-400/40",
  violet: "bg-violet-500/25 text-violet-100 ring-1 ring-violet-400/40",
};

function navInitial(label: string): string {
  const parts = label.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
  return (parts[0]?.slice(0, 2) || "?").toUpperCase();
}

/** Text + icon when expanded; icon rail when collapsed (MAC-overridable). */
export function CollapsibleNavLink({
  href,
  label,
  navKey,
  iconId: defaultIconId = "shield",
  subtitle,
  active,
  collapsed,
  accent = "cyan",
  onClick,
}: Props) {
  const overrides = useSidebarNavIconOverrides();
  const iconId = (navKey && overrides[navKey]) || defaultIconId;

  const iconEl = (
    <SidebarNavIcon id={iconId} className={collapsed ? "h-[18px] w-[18px]" : "h-4 w-4 shrink-0 opacity-90"} />
  );

  if (collapsed) {
    return (
      <Link
        href={href}
        title={label}
        onClick={onClick}
        className={`mx-auto flex h-9 w-9 items-center justify-center rounded-lg transition ${
          active ? iconActive[accent] : "text-slate-400 hover:bg-white/5 hover:text-white"
        }`}
      >
        {iconEl}
        <span className="sr-only">{label}</span>
      </Link>
    );
  }

  return (
    <Link
      href={href}
      onClick={onClick}
      className={`flex items-start gap-2.5 rounded-lg px-3 py-2 transition-colors ${
        active ? activeClass[accent] : "text-slate-400 hover:bg-white/5 hover:text-white"
      }`}
    >
      <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${active ? "bg-white/10" : "bg-white/[0.04]"}`}>
        {iconEl}
      </span>
      <span className="min-w-0">
        <span className="block truncate">{label}</span>
        {subtitle ? <span className="mt-0.5 block text-[11px] font-normal text-slate-600">{subtitle}</span> : null}
      </span>
    </Link>
  );
}

export { navInitial };
