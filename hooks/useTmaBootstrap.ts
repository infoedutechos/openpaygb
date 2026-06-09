"use client";

import { useCallback, useEffect, useState } from "react";
import type { TmaMePayload } from "@/lib/tma-types";

function readInitData(): string {
  if (typeof window === "undefined") return "";
  const tg = (window as Window & { Telegram?: { WebApp?: { initData?: string } } }).Telegram?.WebApp;
  if (tg?.initData?.trim()) return tg.initData.trim();
  if (process.env.NEXT_PUBLIC_BYPASS_TELEGRAM_AUTH === "true") {
    return "dev-bypass";
  }
  return "";
}

export function useTmaBootstrap(initialTab?: string) {
  const [data, setData] = useState<TmaMePayload | null>(null);
  const [tab, setTab] = useState(initialTab ?? "home");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const boot = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const initData = readInitData();
      const r = await fetch("/api/tma/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ initData: initData || "dev-bypass" }),
      });
      if (!r.ok) {
        const j = (await r.json()) as { error?: string };
        throw new Error(j.error ?? "Could not start Mini App session");
      }
      const j = (await r.json()) as TmaMePayload;
      setData(j);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Boot failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialTab) setTab(initialTab);
    void boot();
  }, [boot, initialTab]);

  useEffect(() => {
    const tg = (window as Window & { Telegram?: { WebApp?: { ready?: () => void; expand?: () => void } } })
      .Telegram?.WebApp;
    tg?.ready?.();
    tg?.expand?.();
  }, []);

  return { data, tab, setTab, loading, error, refresh: boot };
}
