"use client";

import { useMemo } from "react";
import {
  getTonConnectUiProviderExtras,
  type TonConnectUiProviderExtras,
} from "@/lib/tonconnect-ui-options";

/** Bundled wallet list — same on server and client (no empty-then-update remount). */
export function useTonConnectUiExtras(): TonConnectUiProviderExtras {
  return useMemo(() => getTonConnectUiProviderExtras(), []);
}
