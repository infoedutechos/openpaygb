"use client";

import { useEffect } from "react";
import { isClientFetchNetworkError } from "@/lib/client-fetch-error";

function isNetworkNoise(value: unknown): boolean {
  if (isClientFetchNetworkError(value)) return true;
  if (typeof value === "string") {
    const m = value.toLowerCase();
    return m === "network error" || m.includes("failed to fetch") || m.includes("networkerror");
  }
  if (value && typeof value === "object" && "message" in value) {
    return isNetworkNoise((value as { message?: unknown }).message);
  }
  return false;
}

/**
 * Dev-only: suppress unhandled NetworkError / "network error" TypeErrors that fire
 * while Webpack is still compiling or the dev server briefly drops connections (HMR).
 * Production is unchanged.
 */
export function DevNetworkFetchGuard() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;

    const onRejection = (event: PromiseRejectionEvent) => {
      if (!isNetworkNoise(event.reason)) return;
      event.preventDefault();
    };

    const onError = (event: ErrorEvent) => {
      if (!isNetworkNoise(event.error) && !isNetworkNoise(event.message)) return;
      event.preventDefault();
    };

    const origConsoleError = console.error.bind(console);
    console.error = (...args: unknown[]) => {
      if (args.length > 0 && args.every((a) => isNetworkNoise(a) || a === undefined)) return;
      if (args.some((a) => isNetworkNoise(a)) && args.length <= 2) return;
      origConsoleError(...args);
    };

    window.addEventListener("unhandledrejection", onRejection);
    window.addEventListener("error", onError);
    return () => {
      window.removeEventListener("unhandledrejection", onRejection);
      window.removeEventListener("error", onError);
      console.error = origConsoleError;
    };
  }, []);

  return null;
}
