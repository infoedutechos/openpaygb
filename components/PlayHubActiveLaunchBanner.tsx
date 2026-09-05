"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { readJsonResponse } from "@/utils/read-json-response";
import {
  openPlayHubLaunchTarget,
  type PublicPlayHubLaunchTarget,
  usePlayHubLaunch,
} from "@/components/PlayHubLaunchSwitcher";
import { BUILTIN_PLAY_HUB_TARGET_ID } from "@/lib/play-hub-launch-targets";

/**
 * On /clicker: if MAC primary launch is Telegram/external, auto-open it once
 * and show a clear banner so URA is not mistaken for the active game.
 */
export function PlayHubActiveLaunchBanner({ suppressAutoOpen = false }: { suppressAutoOpen?: boolean }) {
  const { active, loading, selectTarget } = usePlayHubLaunch();
  const [opened, setOpened] = useState(false);

  const isExternalPrimary =
    Boolean(active) &&
    active!.id !== BUILTIN_PLAY_HUB_TARGET_ID &&
    active!.kind !== "internal";

  useEffect(() => {
    if (suppressAutoOpen || loading || !isExternalPrimary || !active || opened) return;
    const key = `odelhub.playLaunchOpened.${active.id}`;
    try {
      if (sessionStorage.getItem(key) === "1") {
        setOpened(true);
        return;
      }
      sessionStorage.setItem(key, "1");
    } catch {
      /* ignore */
    }
    if (active.kind === "iframe" || active.openMode === "iframe") {
      selectTarget(active);
    } else {
      openPlayHubLaunchTarget(active);
    }
    setOpened(true);
  }, [suppressAutoOpen, loading, isExternalPrimary, active, opened, selectTarget]);

  if (loading || !isExternalPrimary || !active) return null;

  return (
    <div className="sticky top-0 z-[60] border-b border-[#f3ba2f]/35 bg-[#1a1408] px-3 py-2.5 text-sm text-[#ffe9a8]">
      <p className="font-semibold text-[#f3ba2f]">Primary Play Hub: {active.label}</p>
      <p className="mt-0.5 text-xs text-slate-300 break-all">{active.url}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => selectTarget(active)}
          className="rounded-lg bg-[#f3ba2f] px-3 py-1.5 text-xs font-bold text-slate-950"
        >
          Open {active.label}
        </button>
        <Link
          href="/clicker?builtin=1"
          className="rounded-lg border border-white/20 px-3 py-1.5 text-xs font-semibold text-slate-200"
          onClick={() => {
            try {
              sessionStorage.setItem(`odelhub.playLaunchOpened.${active.id}`, "1");
            } catch {
              /* ignore */
            }
          }}
        >
          Stay on built-in URAPearls
        </Link>
      </div>
    </div>
  );
}

/** Optional: fetch active without provider (for shell / nav). */
export async function fetchPublicPlayHubActive(): Promise<PublicPlayHubLaunchTarget | null> {
  const r = await fetch("/api/public/play-hub-launch", { cache: "no-store" });
  const parsed = await readJsonResponse<{ active: PublicPlayHubLaunchTarget | null }>(r);
  if (!parsed.ok) return null;
  return parsed.data.active ?? null;
}
