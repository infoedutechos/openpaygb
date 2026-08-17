"use client";

import Link from "next/link";
import React, { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { SiteNavMenu } from "@/lib/ecosystem/site-nav-menus";

const ACCENT_BTN: Record<SiteNavMenu["accent"], string> = {
  cyan: "text-cyan-200/95 hover:bg-cyan-500/10",
  sky: "text-sky-200/95 hover:bg-sky-500/10",
  violet: "text-violet-200/95 hover:bg-violet-500/10",
  emerald: "text-emerald-200/95 hover:bg-emerald-500/10",
  amber: "text-amber-200/95 hover:bg-amber-500/10",
  teal: "text-teal-200/95 hover:bg-teal-500/10",
};

const ACCENT_PANEL: Record<SiteNavMenu["accent"], string> = {
  cyan: "border-cyan-500/25",
  sky: "border-sky-500/25",
  violet: "border-violet-500/25",
  emerald: "border-emerald-500/25",
  amber: "border-amber-500/25",
  teal: "border-teal-500/25",
};

const PANEL_WIDTH_PX = 288; // 18rem
/** Delay before closing so the pointer can move from the button into the portaled panel. */
const CLOSE_DELAY_MS = 150;

type PanelPosition = { top: number; left: number; maxHeight: number };

export function SiteHeaderNavDropdown({ menu }: { menu: SiteNavMenu }) {
  const [open, setOpen] = useState(false);
  const [panelPos, setPanelPos] = useState<PanelPosition | null>(null);
  const [finePointer, setFinePointer] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const listId = useId();

  useEffect(() => {
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    const sync = () => setFinePointer(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const clearCloseTimer = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  const openMenu = () => {
    clearCloseTimer();
    setOpen(true);
  };

  const scheduleClose = () => {
    clearCloseTimer();
    closeTimerRef.current = setTimeout(() => setOpen(false), CLOSE_DELAY_MS);
  };

  useEffect(() => () => clearCloseTimer(), []);

  const updatePosition = () => {
    const btn = buttonRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const width = Math.min(PANEL_WIDTH_PX, window.innerWidth - 16);
    let left = rect.right - width;
    left = Math.max(8, Math.min(left, window.innerWidth - width - 8));
    const top = rect.bottom + 6;
    const maxHeight = Math.min(window.innerHeight * 0.7, window.innerHeight - top - 12, 384);
    setPanelPos({ top, left, maxHeight: Math.max(maxHeight, 120) });
  };

  useLayoutEffect(() => {
    if (!open) {
      setPanelPos(null);
      return;
    }
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      const target = e.target as Node;
      if (rootRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setOpen(false);
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

  const panel =
    open && panelPos ? (
      <div
        ref={panelRef}
        id={listId}
        role="menu"
        onMouseEnter={finePointer ? openMenu : undefined}
        onMouseLeave={finePointer ? scheduleClose : undefined}
        style={{
          top: panelPos.top,
          left: panelPos.left,
          width: Math.min(PANEL_WIDTH_PX, window.innerWidth - 16),
          maxHeight: panelPos.maxHeight,
        }}
        className={`fixed z-[100] flex flex-col overflow-hidden rounded-xl border bg-[#0d1526]/98 p-1.5 shadow-xl shadow-black/40 backdrop-blur-md ${ACCENT_PANEL[menu.accent]}`}
      >
        <Link
          href={menu.href}
          role="menuitem"
          onClick={() => setOpen(false)}
          className="shrink-0 rounded-lg px-3 py-2 text-sm font-semibold text-white hover:bg-white/5"
        >
          Open {menu.label}
        </Link>
        <ul className="mt-1 min-h-0 flex-1 overflow-y-auto overscroll-contain border-t border-white/10 pt-1 [-webkit-overflow-scrolling:touch]">
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
    ) : null;

  return (
    <>
      <div
        ref={rootRef}
        className="relative shrink-0"
        onMouseEnter={finePointer ? openMenu : undefined}
        onMouseLeave={finePointer ? scheduleClose : undefined}
      >
        <button
          ref={buttonRef}
          type="button"
          aria-expanded={open}
          aria-haspopup="true"
          aria-controls={listId}
          onClick={() => {
            clearCloseTimer();
            setOpen((v) => !v);
          }}
          className={`inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-lg px-2 py-1.5 text-xs font-semibold transition-colors sm:px-2.5 sm:py-2 sm:text-sm ${ACCENT_BTN[menu.accent]}`}
        >
          <span>{menu.label}</span>
          <svg
            viewBox="0 0 20 20"
            fill="currentColor"
            className={`h-3.5 w-3.5 shrink-0 opacity-70 transition-transform ${open ? "rotate-180" : ""}`}
            aria-hidden
          >
            <path d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 10.94l3.71-3.71a.75.75 0 1 1 1.06 1.06l-4.24 4.25a.75.75 0 0 1-1.06 0L5.21 8.29a.75.75 0 0 1 .02-1.08Z" />
          </svg>
        </button>
      </div>
      {typeof document !== "undefined" && panel ? createPortal(panel, document.body) : null}
    </>
  );
}
