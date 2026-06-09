"use client";

import { useCallback, useEffect, useState } from "react";
import type { StudentMeProfile } from "@/lib/profile-mappers";

const TTL_MS = 30_000;

type StudentMeJson = { student: StudentMeProfile | null };

let cached: { at: number; data: StudentMeJson | null } | null = null;
let inflight: Promise<StudentMeJson | null> | null = null;

export function invalidateStudentMeCache() {
  cached = null;
  inflight = null;
}

async function loadStudentMe(): Promise<StudentMeJson | null> {
  try {
    const r = await fetch("/api/student/me", { credentials: "include" });
    if (r.status === 401) return { student: null };
    if (!r.ok) return null;
    return (await r.json()) as StudentMeJson;
  } catch {
    return null;
  }
}

function getStudentMe(): Promise<StudentMeJson | null> {
  const now = Date.now();
  if (cached && now - cached.at < TTL_MS) {
    return Promise.resolve(cached.data);
  }
  if (inflight) return inflight;
  inflight = loadStudentMe()
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

/** Dedupes `/api/student/me` across student shell + pages (30s in-memory TTL). */
export function useStudentMe() {
  const [data, setData] = useState<StudentMeJson | null>(cached?.data ?? null);
  const [loading, setLoading] = useState(!cached);

  const refresh = useCallback(() => {
    invalidateStudentMeCache();
    setLoading(true);
    void getStudentMe()
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
    void getStudentMe()
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
