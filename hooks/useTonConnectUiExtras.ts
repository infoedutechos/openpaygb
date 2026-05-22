"use client";

import { useMemo } from "react";
import {
  getTonConnectUiProviderExtras,
  type TonConnectUiProviderExtras,
} from "@/lib/tonconnect-ui-options";

/** Localhost wallet restriction — computed on first client render (no empty-then-update remount). */
export function useTonConnectUiExtras(): TonConnectUiProviderExtras {
  return useMemo(() => {
    if (typeof window === "undefined") return {};
    return getTonConnectUiProviderExtras(window.location.hostname);
  }, []);
}
