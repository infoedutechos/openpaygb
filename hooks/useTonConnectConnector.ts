"use client";

import { useEffect, useState } from "react";
import type { TonConnect } from "@tonconnect/sdk";
import { createTonConnectConnector } from "@/lib/tonconnect-connector";

/** TonConnect requires localStorage — only construct after client mount. */
export function useTonConnectConnector(manifestUrl: string): TonConnect | null {
  const [connector, setConnector] = useState<TonConnect | null>(null);

  useEffect(() => {
    setConnector(createTonConnectConnector(manifestUrl, window.location.origin));
  }, [manifestUrl]);

  return connector;
}
