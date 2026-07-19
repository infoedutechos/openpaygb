"use client";

import Link from "next/link";

type Props = {
  href: string;
  label?: string;
  className?: string;
  /** Compact chevron style for mobile chrome */
  compact?: boolean;
};

/**
 * Explicit parent navigation (preferred over history.back for TMA / deep links).
 */
export function PageBackLink({ href, label = "Back", className = "", compact = false }: Props) {
  if (compact) {
    return (
      <Link
        href={href}
        aria-label={label.startsWith("Back") ? label : `Back to ${label}`}
        className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/12 bg-white/[0.04] text-slate-200 hover:border-white/25 hover:bg-white/[0.08] ${className}`}
      >
        <span aria-hidden className="text-lg leading-none">
          ←
        </span>
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className={`inline-flex min-h-[40px] items-center gap-1.5 text-sm font-medium text-slate-400 transition-colors hover:text-white ${className}`}
    >
      <span aria-hidden>←</span>
      <span>{label.startsWith("Back") || label.startsWith("←") ? label : `Back to ${label}`}</span>
    </Link>
  );
}
