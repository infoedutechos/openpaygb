"use client";

import { Suspense, useCallback, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import TuitionHubBottomNav from "@/components/hub/TuitionHubBottomNav";
import PlayHubBottomNav from "@/components/hub/PlayHubBottomNav";
import DexHubBottomNav from "@/components/hub/DexHubBottomNav";
import { useStandaloneApp } from "@/components/standalone/StandaloneAppProvider";
import { HUB_ORDER, homeHubFromSearchParam, homeUrlForHub, type HubKey } from "@/lib/ecosystem/hubs";

/** Home bottom switcher — developers hub has its own lobby at /developers */
const HOME_SHELL_HUBS = HUB_ORDER.filter((k) => k !== "developers");

const HUB_TAB_CLASS = {
  tuition:
    "flex-1 rounded-lg py-2 text-[10px] font-bold uppercase tracking-wide transition-colors sm:text-xs " +
    "data-[active=true]:bg-cyan-900/55 data-[active=true]:text-white data-[active=true]:ring-1 data-[active=true]:ring-cyan-400/30 " +
    "data-[active=false]:text-slate-400 data-[active=false]:hover:bg-white/5 data-[active=false]:hover:text-white",
  play:
    "flex-1 rounded-lg py-2 text-[10px] font-bold uppercase tracking-wide transition-colors sm:text-xs " +
    "data-[active=true]:bg-ura-panel-3/90 data-[active=true]:text-white data-[active=true]:ring-1 data-[active=true]:ring-[#f3ba2f]/25 " +
    "data-[active=false]:text-slate-400 data-[active=false]:hover:bg-white/5 data-[active=false]:hover:text-white",
  dex:
    "flex-1 rounded-lg py-2 text-[10px] font-bold uppercase tracking-wide transition-colors sm:text-xs " +
    "data-[active=true]:bg-violet-900/55 data-[active=true]:text-white data-[active=true]:ring-1 data-[active=true]:ring-violet-400/35 " +
    "data-[active=false]:text-slate-400 data-[active=false]:hover:bg-white/5 data-[active=false]:hover:text-white",
} as const;

function HomeHubShellInner({ children }: { children: ReactNode }) {
  const { app } = useStandaloneApp();
  const router = useRouter();
  const searchParams = useSearchParams();
  const hub = homeHubFromSearchParam(searchParams.get("hub"));
  const setHub = useCallback(
    (next: HubKey) => {
      router.replace(homeUrlForHub(next), { scroll: false });
    },
    [router],
  );

  if (app?.hideEcosystemLinks) {
    return (
      <div className="pb-40">
        {children}
        <div
          className="fixed bottom-0 left-1/2 z-50 w-full max-w-xl -translate-x-1/2 overflow-hidden rounded-t-2xl border border-slate-600/40 bg-[rgb(6_14_26_/_0.98)] shadow-[0_-12px_40px_rgba(0,0,0,0.45)] backdrop-blur-md"
          style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
        >
          <TuitionHubBottomNav mode="slot" />
        </div>
      </div>
    );
  }

  return (
    <div className="pb-40">
      {children}
      <div
        className="fixed bottom-0 left-1/2 z-50 w-full max-w-xl -translate-x-1/2 overflow-hidden rounded-t-2xl border border-slate-600/40 bg-[rgb(6_14_26_/_0.98)] shadow-[0_-12px_40px_rgba(0,0,0,0.45)] backdrop-blur-md"
        style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
      >
        <div className="flex gap-0.5 border-b border-white/10 bg-black/25 px-1.5 py-1.5 sm:gap-1 sm:px-2">
          {HOME_SHELL_HUBS.map((key) => (
            <button
              key={key}
              type="button"
              data-active={hub === key}
              onClick={() => setHub(key)}
              className={`min-h-[44px] ${HUB_TAB_CLASS[key]}`}
            >
              {key === "tuition" ? "Tuition" : key === "play" ? "Play" : "Dex"}
            </button>
          ))}
        </div>
        {hub === "tuition" ? <TuitionHubBottomNav mode="slot" /> : hub === "play" ? <PlayHubBottomNav mode="slot" /> : <DexHubBottomNav mode="slot" />}
      </div>
    </div>
  );
}

export function HomeHubShell({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<div className="pb-40">{children}</div>}>
      <HomeHubShellInner>{children}</HomeHubShellInner>
    </Suspense>
  );
}
