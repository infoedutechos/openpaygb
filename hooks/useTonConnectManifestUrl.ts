"use client";

import { useEffect, useState } from "react";
import { getTonConnectManifestUrl } from "@/lib/tonconnect-manifest-url";

/** Browser origin wins after hydration (avoids frozen NEXT_PUBLIC_APP_URL on preview/ngrok hosts). */
export function useTonConnectManifestUrl(): string {
  const [manifestUrl, setManifestUrl] = useState(() => getTonConnectManifestUrl());

  useEffect(() => {
    setManifestUrl(getTonConnectManifestUrl(window.location.origin));
  }, []);

  return manifestUrl;
}
