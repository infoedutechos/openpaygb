"use client";

import { createContext, useContext, useMemo } from "react";
import type { HubKey } from "@/lib/ecosystem/hubs";
import { HUB_ORDER } from "@/lib/ecosystem/hubs";

/** `true` = hub is hidden. */
export type HubVisibilityState = Record<HubKey, boolean>;

const DEFAULT_VISIBLE: HubVisibilityState = {
  tuition: false,
  play: false,
  dex: false,
  developers: false,
};

const HubVisibilityContext = createContext<HubVisibilityState>(DEFAULT_VISIBLE);

export function HubVisibilityProvider({
  initial,
  children,
}: {
  initial: HubVisibilityState;
  children: React.ReactNode;
}) {
  const value = useMemo(() => initial, [initial]);
  return <HubVisibilityContext.Provider value={value}>{children}</HubVisibilityContext.Provider>;
}

export function useHubVisibility(): HubVisibilityState {
  return useContext(HubVisibilityContext);
}

export function useIsHubHidden(hub: HubKey): boolean {
  return useHubVisibility()[hub] === true;
}

export function useVisibleHubKeys(): HubKey[] {
  const state = useHubVisibility();
  return useMemo(() => HUB_ORDER.filter((key) => !state[key]), [state]);
}
