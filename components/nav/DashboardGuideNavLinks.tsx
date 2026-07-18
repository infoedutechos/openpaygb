"use client";

import Link from "next/link";
import type { AudienceGuide } from "@/lib/audience-guides";
import { HELP_CENTER_HREF } from "@/lib/audience-guides";

type Props = {
  guides: AudienceGuide[];
  /** Match shell density (sidebar vs mobile strip). */
  compact?: boolean;
  className?: string;
};

/**
 * Sidebar / mobile nav links to the audience handbook(s) for this dashboard.
 */
export function DashboardGuideNavLinks({ guides, compact = false, className = "" }: Props) {
  if (!guides.length) return null;

  if (compact) {
    return (
      <>
        {guides.map((g) => (
          <Link
            key={g.id}
            href={g.helpHref}
            title={g.dashboardLabel}
            className={`shrink-0 rounded-md px-2 py-2 min-h-[44px] inline-flex items-center text-slate-400 hover:text-cyan-200 ${className}`}
          >
            {guides.length === 1
              ? "Guide"
              : g.id === "student_schools"
                ? "Stu·Sch"
                : g.id === "student_higher"
                  ? "Stu·Hi"
                  : g.id === "admin_schools"
                    ? "Adm·Sch"
                    : g.id === "admin_higher"
                      ? "Adm·Hi"
                      : "Guide"}
          </Link>
        ))}
        <Link
          href={HELP_CENTER_HREF}
          className="shrink-0 rounded-md px-2 py-2 min-h-[44px] inline-flex items-center text-slate-400 hover:text-cyan-200"
        >
          Help
        </Link>
      </>
    );
  }

  return (
    <div className={`mt-2 space-y-0.5 border-t border-white/10 pt-2 ${className}`}>
      <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-600">Guides</p>
      {guides.map((g) => (
        <Link
          key={g.id}
          href={g.helpHref}
          className="block rounded-lg px-3 py-2 text-sm text-slate-400 transition-colors hover:bg-white/5 hover:text-cyan-100"
        >
          {g.dashboardLabel}
          <span className="block text-[11px] text-slate-600">Handbook</span>
        </Link>
      ))}
      <Link
        href={HELP_CENTER_HREF}
        className="block rounded-lg px-3 py-2 text-sm text-slate-400 transition-colors hover:bg-white/5 hover:text-cyan-100"
      >
        Help center
        <span className="block text-[11px] text-slate-600">Search all articles</span>
      </Link>
    </div>
  );
}
