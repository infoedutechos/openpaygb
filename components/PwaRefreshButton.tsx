"use client";

import { useEffect, useState } from "react";
import { isPwaStandalone, pwaDisplayModeMediaQueries } from "@/lib/pwa-standalone";

/** Shown only in installed PWA mode — browsers hide the normal reload control in standalone. */
export function PwaRefreshButton() {
  const [visible, setVisible] = useState(false);

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

  if (!visible) return null;

  return (
    <button
      type="button"
      onClick={() => window.location.reload()}
      className="fixed right-[max(0.75rem,env(safe-area-inset-right))] top-[max(0.75rem,env(safe-area-inset-top))] z-[90] inline-flex min-h-[40px] items-center gap-1.5 rounded-full border border-white/15 bg-slate-950/85 px-3 py-1.5 text-xs font-semibold text-slate-100 shadow-lg backdrop-blur-sm hover:border-cyan-400/35 hover:bg-slate-900/90"
      aria-label="Refresh app"
      title="Refresh app"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        className="h-4 w-4 shrink-0 text-cyan-300"
        aria-hidden
      >
        <path
          fillRule="evenodd"
          d="M15.312 11.424a5.5 5.5 0 01-9.201 2.466l-.312-.311h2.433a.75.75 0 000-1.5H3.989a.75.75 0 00-.75.75v4.242a.75.75 0 001.5 0v-2.43l.31.31a7 7 0 0011.712-3.138.75.75 0 00-1.449-.39zm1.23-3.723a.75.75 0 00.219-.53V2.929a.75.75 0 00-1.5 0V5.36l-.31-.31A7 7 0 003.239 8.188a.75.75 0 101.448.389A5.5 5.5 0 0113.89 6.11l.311.31h-2.432a.75.75 0 000 1.5h4.243a.75.75 0 00.53-.219z"
          clipRule="evenodd"
        />
      </svg>
      Refresh
    </button>
  );
}
