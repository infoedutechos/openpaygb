"use client";

import type { StandaloneAppDefinition } from "@/lib/standalone-apps";

const ACCENT_CLASS: Record<StandaloneAppDefinition["id"], string> = {
  odelpay_universities: "border-cyan-500/30 bg-cyan-950/40 text-cyan-100",
  odelpay_schools: "border-sky-500/30 bg-sky-950/40 text-sky-100",
  openpaygb: "border-violet-500/30 bg-violet-950/40 text-violet-100",
  dex: "border-violet-500/30 bg-violet-950/40 text-violet-100",
  play: "border-amber-500/30 bg-[#1a1408]/90 text-amber-100",
  odelhub_devs: "border-emerald-500/30 bg-emerald-950/40 text-emerald-100",
};

export function StandaloneAppTopBar({ app }: { app: StandaloneAppDefinition }) {
  return (
    <header
      className={`sticky top-0 z-[60] border-b px-4 py-2.5 backdrop-blur-md ${ACCENT_CLASS[app.id]}`}
      data-standalone-app={app.id}
    >
      <div className="mx-auto flex max-w-xl items-baseline justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold tracking-tight">{app.title}</p>
          <p className="truncate text-[11px] opacity-80">{app.subtitle}</p>
        </div>
      </div>
    </header>
  );
}
