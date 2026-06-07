"use client";

import { useEffect } from "react";

/** Manifest shortcut `/?pwa_refresh=1` — reload once without leaving the shortcut URL in history. */
export function PwaRefreshShortcutHandler() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (url.searchParams.get("pwa_refresh") !== "1") return;
    url.searchParams.delete("pwa_refresh");
    const next = `${url.pathname}${url.search}${url.hash}`;
    window.history.replaceState(null, "", next);
    window.location.reload();
  }, []);

  return null;
}
