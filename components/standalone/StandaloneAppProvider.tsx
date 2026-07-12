"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { StandaloneAppDefinition, StandaloneAppId } from "@/lib/standalone-apps";

export type StandaloneAppContextValue = {
  appId: StandaloneAppId | null;
  app: StandaloneAppDefinition | null;
};

const StandaloneAppContext = createContext<StandaloneAppContextValue>({
  appId: null,
  app: null,
});

export function StandaloneAppProvider({
  value,
  children,
}: {
  value: StandaloneAppContextValue;
  children: ReactNode;
}) {
  return <StandaloneAppContext.Provider value={value}>{children}</StandaloneAppContext.Provider>;
}

export function useStandaloneApp(): StandaloneAppContextValue {
  return useContext(StandaloneAppContext);
}

export function useStandaloneMode(): boolean {
  return useContext(StandaloneAppContext).appId !== null;
}
