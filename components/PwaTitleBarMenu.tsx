"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { usePlatformSocial } from "@/components/PlatformSocialProvider";
import { isPwaStandalone, pwaDisplayModeMediaQueries } from "@/lib/pwa-standalone";

/** Overflow menu for installed PWA — browsers hide reload in standalone; native ⋮ cannot be extended by web apps. */
export function PwaTitleBarMenu() {
  const platform = usePlatformSocial();
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [open, setOpen] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  useEffect(() => {
    const sync = () => setVisible(isPwaStandalone());
    sync();
    const queries = pwaDisplayModeMediaQueries().map((q) => window.matchMedia(q));
    const onChange = () => sync();
    for (const mq of queries) mq.addEventListener("change", onChange);
    return () => {
      for (const mq of queries) mq.removeEventListener("change", onChange);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    function onPointer(ev: MouseEvent) {
      if (!rootRef.current?.contains(ev.target as Node)) setOpen(false);
    }
    function onKey(ev: KeyboardEvent) {
      if (ev.key === "Escape") {
        setOpen(false);
        setShowInfo(false);
      }
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const refresh = useCallback(() => {
    setOpen(false);
    setShowInfo(false);
    window.location.reload();
  }, []);

  if (!visible) return null;

  return (
    <>
      <div
        ref={rootRef}
        className="fixed right-[max(0.5rem,env(safe-area-inset-right))] top-[max(0.35rem,env(safe-area-inset-top))] z-[95] flex items-center"
        style={{
          height: "var(--pwa-titlebar-height, 2.5rem)",
          paddingRight: "env(titlebar-area-x, 0px)",
        }}
      >
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-200 hover:bg-white/10"
          aria-label="App menu"
          aria-expanded={open}
          aria-haspopup="menu"
          aria-controls={menuId}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5" aria-hidden>
            <path d="M10 3a1.5 1.5 0 110 3 1.5 1.5 0 010-3zM10 8.5a1.5 1.5 0 110 3 1.5 1.5 0 010-3zM10 14a1.5 1.5 0 110 3 1.5 1.5 0 010-3z" />
          </svg>
        </button>

        {open ? (
          <div
            id={menuId}
            role="menu"
            className="absolute right-0 top-full mt-1 min-w-[11rem] overflow-hidden rounded-xl border border-white/12 bg-slate-950/95 py-1 text-sm shadow-xl backdrop-blur-md"
          >
            <button
              type="button"
              role="menuitem"
              onClick={refresh}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-slate-100 hover:bg-white/8"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-cyan-300" aria-hidden>
                <path
                  fillRule="evenodd"
                  d="M15.312 11.424a5.5 5.5 0 01-9.201 2.466l-.312-.311h2.433a.75.75 0 000-1.5H3.989a.75.75 0 00-.75.75v4.242a.75.75 0 001.5 0v-2.43l.31.31a7 7 0 0011.712-3.138.75.75 0 00-1.449-.39zm1.23-3.723a.75.75 0 00.219-.53V2.929a.75.75 0 00-1.5 0V5.36l-.31-.31A7 7 0 003.239 8.188a.75.75 0 101.448.389A5.5 5.5 0 0113.89 6.11l.311.31h-2.432a.75.75 0 000 1.5h4.243a.75.75 0 00.53-.219z"
                  clipRule="evenodd"
                />
              </svg>
              Refresh
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                setShowInfo(true);
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-slate-100 hover:bg-white/8"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-slate-400" aria-hidden>
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
              App info
            </button>
          </div>
        ) : null}
      </div>

      {showInfo ? (
        <div
          className="fixed inset-0 z-[96] flex items-end justify-center bg-black/55 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pwa-app-info-title"
          onClick={() => setShowInfo(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-white/12 bg-slate-950 p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="pwa-app-info-title" className="text-lg font-semibold text-white">
              {platform.homeScreenTitle}
            </h2>
            {platform.homeScreenDescription ? (
              <p className="mt-2 text-sm leading-relaxed text-slate-400">{platform.homeScreenDescription}</p>
            ) : null}
            <dl className="mt-4 space-y-2 text-xs text-slate-500">
              <div className="flex justify-between gap-3">
                <dt>Short name</dt>
                <dd className="font-mono text-slate-300">{platform.homeScreenShortName}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt>Display</dt>
                <dd className="font-mono text-slate-300">standalone PWA</dd>
              </div>
            </dl>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={refresh}
                className="flex-1 rounded-xl bg-cyan-500/90 px-3 py-2 text-sm font-semibold text-slate-950 hover:brightness-110"
              >
                Refresh
              </button>
              <button
                type="button"
                onClick={() => setShowInfo(false)}
                className="rounded-xl border border-white/15 px-3 py-2 text-sm text-slate-300 hover:bg-white/5"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
