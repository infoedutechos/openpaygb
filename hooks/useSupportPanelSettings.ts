"use client";

import { useCallback, useEffect, useState } from "react";
import { usePlatformSocial } from "@/components/PlatformSocialProvider";
import type { PublicSiteUiSettings } from "@/lib/site-ui-shared";

const SITE_UI_UPDATED = "odelhub-site-ui-updated";

export function notifySiteUiUpdated() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(SITE_UI_UPDATED));
  }
}

/** Live public site-ui for the support / agent panel (refreshes after master saves). */
export function useSupportPanelSettings(refreshWhenOpen = false) {
  const platform = usePlatformSocial();
  const [live, setLive] = useState(platform);

  const refetch = useCallback(async () => {
    try {
      const res = await fetch("/api/public/site-ui", { cache: "no-store" });
      if (!res.ok) return;
      const json = (await res.json()) as PublicSiteUiSettings;
      setLive(json);
    } catch {
      /* keep last good snapshot */
    }
  }, []);

  useEffect(() => {
    setLive(platform);
  }, [platform]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refetch();
    }, 400);
    return () => window.clearTimeout(timer);
  }, [refetch]);

  useEffect(() => {
    const onUpdate = () => void refetch();
    window.addEventListener(SITE_UI_UPDATED, onUpdate);
    return () => window.removeEventListener(SITE_UI_UPDATED, onUpdate);
  }, [refetch]);

  useEffect(() => {
    if (refreshWhenOpen) void refetch();
  }, [refreshWhenOpen, refetch]);

  return live;
}
