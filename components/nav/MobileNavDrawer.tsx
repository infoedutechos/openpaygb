"use client";

import Link from "next/link";
import { useEffect, useId } from "react";
import { createPortal } from "react-dom";

export type MobileNavAccent = "cyan" | "amber" | "emerald" | "violet";

export type MobileNavItem = {
  href: string;
  label: string;
  description?: string;
  active?: boolean;
  /** Called after navigation close (e.g. analytics). Prefer href for routes. */
  onSelect?: () => void;
};

export type MobileNavSection = {
  id: string;
  label?: string;
  items: MobileNavItem[];
};

const ACCENT: Record<
  MobileNavAccent,
  { active: string; border: string; ring: string; title: string }
> = {
  cyan: {
    active: "bg-cyan-500/15 font-medium text-cyan-100",
    border: "border-white/10",
    ring: "focus-visible:ring-cyan-400/50",
    title: "text-cyan-200",
  },
  amber: {
    active: "bg-amber-500/15 font-medium text-amber-100",
    border: "border-amber-500/20",
    ring: "focus-visible:ring-amber-400/50",
    title: "text-amber-200",
  },
  emerald: {
    active: "bg-emerald-500/15 font-medium text-emerald-100",
    border: "border-emerald-500/20",
    ring: "focus-visible:ring-emerald-400/50",
    title: "text-emerald-200",
  },
  violet: {
    active: "bg-violet-500/15 font-medium text-violet-100",
    border: "border-violet-500/20",
    ring: "focus-visible:ring-violet-400/50",
    title: "text-violet-200",
  },
};

type DrawerProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  accent?: MobileNavAccent;
  side?: "right" | "left";
  /** md:hidden for dashboard shells; lg:hidden for site header */
  breakpointHideClassName?: string;
  header?: React.ReactNode;
  sections: MobileNavSection[];
  afterSections?: React.ReactNode;
  footer?: React.ReactNode;
  panelId?: string;
};

/**
 * Shared hidable mobile navigation drawer (hamburger menus).
 * Portals to document.body; locks scroll; Escape closes.
 */
export function MobileNavDrawer({
  open,
  onClose,
  title = "Menu",
  accent = "cyan",
  side = "right",
  breakpointHideClassName = "md:hidden",
  header,
  sections,
  afterSections,
  footer,
  panelId,
}: DrawerProps) {
  const titleId = useId();
  const a = ACCENT[accent];

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  const sideClass =
    side === "right"
      ? "right-0 border-l"
      : "left-0 border-r";

  return createPortal(
    <div
      id={panelId}
      className={`fixed inset-0 z-[110] ${breakpointHideClassName}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
        aria-label="Close menu"
        onClick={onClose}
      />
      <div
        className={`absolute inset-y-0 flex w-[min(22rem,100vw)] flex-col ${sideClass} ${a.border} bg-[#0a101f] shadow-2xl shadow-black/50`}
      >
        <div className={`flex items-center justify-between border-b ${a.border} px-4 py-3`}>
          <p id={titleId} className={`text-sm font-semibold text-white`}>
            {title}
          </p>
          <button
            type="button"
            onClick={onClose}
            className={`rounded-lg p-2 text-slate-300 transition-colors hover:bg-white/5 hover:text-white ${a.ring}`}
            aria-label="Close menu"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5" aria-hidden>
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
          </button>
        </div>

        {header ? <div className={`border-b ${a.border} px-4 py-3`}>{header}</div> : null}

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3">
          <div className="space-y-4">
            {sections.map((section) => (
              <div key={section.id}>
                {section.label ? (
                  <p className={`mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-wider ${a.title}`}>
                    {section.label}
                  </p>
                ) : null}
                <ul className="space-y-0.5">
                  {section.items.map((item) => (
                    <li key={`${section.id}-${item.href}-${item.label}`}>
                      <Link
                        href={item.href}
                        onClick={() => {
                          item.onSelect?.();
                          onClose();
                        }}
                        className={`block rounded-xl px-3 py-2.5 min-h-[44px] transition-colors hover:bg-white/5 ${
                          item.active ? a.active : "text-slate-200"
                        }`}
                      >
                        <span className="text-sm">{item.label}</span>
                        {item.description ? (
                          <span className="mt-0.5 block text-[11px] leading-snug text-slate-500">
                            {item.description}
                          </span>
                        ) : null}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          {afterSections ? <div className={`mt-4 border-t ${a.border} pt-3`}>{afterSections}</div> : null}
        </div>

        {footer ? <div className={`border-t ${a.border} px-3 py-3`}>{footer}</div> : null}
      </div>
    </div>,
    document.body,
  );
}

type MenuButtonProps = {
  open: boolean;
  onClick: () => void;
  controlsId: string;
  accent?: MobileNavAccent;
  label?: string;
  className?: string;
};

/** Hamburger / close toggle for hidable mobile menus. */
export function MobileNavMenuButton({
  open,
  onClick,
  controlsId,
  accent = "cyan",
  label = "Menu",
  className = "",
}: MenuButtonProps) {
  const a = ACCENT[accent];
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={open}
      aria-controls={controlsId}
      aria-label={open ? "Close menu" : `Open ${label.toLowerCase()}`}
      className={`inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-1.5 rounded-lg border ${a.border} bg-white/[0.03] px-2.5 text-slate-200 transition-colors hover:bg-white/5 hover:text-white ${a.ring} ${className}`}
    >
      {open ? (
        <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5" aria-hidden>
          <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
        </svg>
      ) : (
        <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5" aria-hidden>
          <path
            fillRule="evenodd"
            d="M2 4.75A.75.75 0 0 1 2.75 4h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 4.75Zm0 5A.75.75 0 0 1 2.75 9h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 9.75Zm0 5a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1-.75-.75Z"
            clipRule="evenodd"
          />
        </svg>
      )}
      <span className="text-xs font-semibold">{label}</span>
    </button>
  );
}
