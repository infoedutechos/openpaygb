"use client";

import { useEffect, useState } from "react";

type Overrides = Record<string, string>;

const EVENT = "odelhub-sidebar-icons-changed";

let cached: Overrides | null = null;
let inflight: Promise<Overrides> | null = null;

async function fetchOverrides(force = false): Promise<Overrides> {
  if (!force && cached) return cached;
  if (!force && inflight) return inflight;
  inflight = fetch("/api/public/sidebar-nav-icons", { credentials: "omit", cache: "no-store" })
    .then(async (r) => {
      if (!r.ok) return {};
      const j = (await r.json()) as { overrides?: Overrides };
      cached = j.overrides ?? {};
      return cached;
    })
    .catch(() => ({} as Overrides))
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

/** MAC-configured navKey → iconId map (shared across portal shells). */
export function useSidebarNavIconOverrides(): Overrides {
  const [overrides, setOverrides] = useState<Overrides>(cached ?? {});

  useEffect(() => {
    let cancelled = false;
    const apply = (m: Overrides) => {
      if (!cancelled) setOverrides(m);
    };
    void fetchOverrides().then(apply);
    const onChange = () => {
      void fetchOverrides(true).then(apply);
    };
    window.addEventListener(EVENT, onChange);
    return () => {
      cancelled = true;
      window.removeEventListener(EVENT, onChange);
    };
  }, []);

  return overrides;
}

/** Call after MAC save so open portals pick up new icons. */
export function invalidateSidebarNavIconOverridesCache() {
  cached = null;
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(EVENT));
  }
}
