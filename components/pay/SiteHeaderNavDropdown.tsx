"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import type { SiteNavMenu } from "@/lib/ecosystem/site-nav-menus";

const ACCENT_BTN: Record<SiteNavMenu["accent"], string> = {
  cyan: "text-cyan-200/95 hover:bg-cyan-500/10",
  sky: "text-sky-200/95 hover:bg-sky-500/10",
  violet: "text-violet-200/95 hover:bg-violet-500/10",
  emerald: "text-emerald-200/95 hover:bg-emerald-500/10",
};

const ACCENT_PANEL: Record<SiteNavMenu["accent"], string> = {
  cyan: "border-cyan-500/25",
  sky: "border-sky-500/25",
  violet: "border-violet-500/25",
  emerald: "border-emerald-500/25",
};

export function SiteHeaderNavDropdown({ menu }: { menu: SiteNavMenu }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="true"
        aria-controls={listId}
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-2 text-xs font-semibold transition-colors sm:px-3 sm:text-sm ${ACCENT_BTN[menu.accent]}`}
      >
        <span className="max-w-[9.5rem] truncate sm:max-w-none">{menu.label}</span>
        <svg
          viewBox="0 0 20 20"
          fill="currentColor"
          className={`h-3.5 w-3.5 shrink-0 opacity-70 transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden
        >
          <path d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 10.94l3.71-3.71a.75.75 0 1 1 1.06 1.06l-4.24 4.25a.75.75 0 0 1-1.06 0L5.21 8.29a.75.75 0 0 1 .02-1.08Z" />
        </svg>
      </button>

      {open ? (
        <div
          id={listId}
          role="menu"
          className={`absolute right-0 z-50 mt-1.5 w-[min(18rem,calc(100vw-2rem))] rounded-xl border bg-[#0d1526]/98 p-1.5 shadow-xl shadow-black/40 backdrop-blur-md ${ACCENT_PANEL[menu.accent]}`}
        >
          <Link
            href={menu.href}
            role="menuitem"
            onClick={() => setOpen(false)}
            className="block rounded-lg px-3 py-2 text-sm font-semibold text-white hover:bg-white/5"
          >
            Open {menu.label}
          </Link>
          <ul className="mt-1 border-t border-white/10 pt-1">
            {menu.items.map((item) => (
              <li key={`${menu.id}-${item.href}-${item.label}`}>
                <Link
                  href={item.href}
                  role="menuitem"
                  onClick={() => setOpen(false)}
                  className="block rounded-lg px-3 py-2 hover:bg-white/5"
                >
                  <span className="text-sm text-slate-100">{item.label}</span>
                  {item.description ? (
                    <span className="mt-0.5 block text-[11px] leading-snug text-slate-500">{item.description}</span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
