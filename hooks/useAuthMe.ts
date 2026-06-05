"use client";

import { useCallback, useEffect, useState } from "react";
import type { AuthMeJson } from "@/lib/auth-me";

const TTL_MS = 30_000;

let cached: { at: number; data: AuthMeJson | null } | null = null;
let inflight: Promise<AuthMeJson | null> | null = null;

export function invalidateAuthMeCache() {
  cached = null;
  inflight = null;
}

async function loadAuthMe(): Promise<AuthMeJson | null> {
  try {
    const r = await fetch("/api/auth/me", { credentials: "include" });
    if (!r.ok) return null;
    return (await r.json()) as AuthMeJson;
  } catch {
    return null;
  }
}

function getAuthMe(): Promise<AuthMeJson | null> {
  const now = Date.now();
  if (cached && now - cached.at < TTL_MS) {
    return Promise.resolve(cached.data);
  }
  if (inflight) return inflight;
  inflight = loadAuthMe()
    .then((data) => {
      cached = { at: Date.now(), data };
      inflight = null;
      return data;
    })
    .catch(() => {
      inflight = null;
      return null;
    });
  return inflight;
}

/** Dedupes `/api/auth/me` across admin shell + pages (30s in-memory TTL). */
export function useAuthMe() {
  const [data, setData] = useState<AuthMeJson | null>(cached?.data ?? null);
  const [loading, setLoading] = useState(!cached);

  const refresh = useCallback(() => {
    invalidateAuthMeCache();
    setLoading(true);
    void getAuthMe()
      .then((j) => {
        setData(j);
        setLoading(false);
      })
      .catch(() => {
        setData(null);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (cached && Date.now() - cached.at < TTL_MS) {
      setData(cached.data);
      setLoading(false);
      return;
    }
    setLoading(true);
    void getAuthMe()
      .then((j) => {
        if (!cancelled) {
          setData(j);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setData(null);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { data, loading, refresh };
}
