"use client";

import { useLayoutEffect } from "react";
import { installTonConnectConsoleQuiet } from "@/lib/tonconnect-console-quiet-install";

/** Ensures console filters are active before TonConnectUI initializes (idempotent). */
export function TonConnectBridgeConsoleQuiet() {
  useLayoutEffect(() => {
    installTonConnectConsoleQuiet();
  }, []);

  return null;
}
