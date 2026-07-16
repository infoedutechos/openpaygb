"use client";

import Link from "next/link";
import React, { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import type { SiteNavMenu } from "@/lib/ecosystem/site-nav-menus";
import { SITE_HEADER_UTILITY_LINKS } from "@/lib/ecosystem/site-nav-menus";

type Props = {
  open: boolean;
  onClose: () => void;
  menus: SiteNavMenu[];
  studentSignedIn: boolean | null;
};

export function SiteHeaderMobileDrawer({ open, onClose, menus, studentSignedIn }: Props) {
  const titleId = useId();
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setExpanded(null);
      return;
    }
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

  return createPortal(
    <div
      id="site-mobile-menu"
      className="fixed inset-0 z-[110] lg:hidden"
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
      <div className="absolute inset-y-0 right-0 flex w-[min(22rem,100vw)] flex-col border-l border-white/10 bg-[#0a101f] shadow-2xl shadow-black/50">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <p id={titleId} className="text-sm font-semibold text-white">
            Menu
          </p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-300 transition-colors hover:bg-white/5 hover:text-white"
            aria-label="Close menu"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5" aria-hidden>
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3">
          <div className="space-y-1">
            {menus.map((menu) => {
              const isOpen = expanded === menu.id;
              return (
                <div key={menu.id} className="rounded-xl border border-white/10 bg-white/[0.02]">
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => setExpanded(isOpen ? null : menu.id)}
                    className="flex w-full items-center justify-between gap-2 px-3 py-3 text-left text-sm font-semibold text-slate-100"
                  >
                    <span>{menu.label}</span>
                    <svg
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
                      aria-hidden
                    >
                      <path d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 10.94l3.71-3.71a.75.75 0 1 1 1.06 1.06l-4.24 4.25a.75.75 0 0 1-1.06 0L5.21 8.29a.75.75 0 0 1 .02-1.08Z" />
                    </svg>
                  </button>
                  {isOpen ? (
                    <ul className="space-y-0.5 border-t border-white/10 px-2 pb-2 pt-1">
                      <li>
                        <Link
                          href={menu.href}
                          onClick={onClose}
                          className="block rounded-lg px-2.5 py-2 text-sm font-medium text-cyan-200/90 hover:bg-white/5"
                        >
                          Open {menu.label}
                        </Link>
                      </li>
                      {menu.items.map((item) => (
                        <li key={`${menu.id}-${item.href}-${item.label}`}>
                          <Link
                            href={item.href}
                            onClick={onClose}
                            className="block rounded-lg px-2.5 py-2 hover:bg-white/5"
                          >
                            <span className="text-sm text-slate-100">{item.label}</span>
                            {item.description ? (
                              <span className="mt-0.5 block text-[11px] leading-snug text-slate-500">
                                {item.description}
                              </span>
                            ) : null}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              );
            })}
          </div>

          <div className="mt-4 space-y-1 border-t border-white/10 pt-3">
            {SITE_HEADER_UTILITY_LINKS.map((item) => {
              const signedIn = Boolean(item.signedInHref && studentSignedIn);
              const href = signedIn ? item.signedInHref! : item.href;
              const label = signedIn ? item.signedInLabel! : item.label;
              return (
                <Link
                  key={item.label}
                  href={href}
                  onClick={onClose}
                  title={item.title}
                  className={`block rounded-xl px-3 py-3 text-sm font-medium transition-colors ${
                    item.variant === "accent"
                      ? "bg-cyan-500/15 text-cyan-100 hover:bg-cyan-500/25"
                      : item.variant === "admin"
                        ? "border border-white/10 text-slate-200 hover:border-cyan-400/40 hover:text-white"
                        : "text-slate-200 hover:bg-white/5"
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
