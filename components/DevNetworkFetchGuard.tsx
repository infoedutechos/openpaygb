"use client";

import { useEffect } from "react";
import { isClientFetchNetworkError } from "@/lib/client-fetch-error";

/**
 * Dev-only: suppress unhandled NetworkError from fetch during Webpack compiles / HMR reloads.
 * Production is unchanged.
 */
export function DevNetworkFetchGuard() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;

    const onRejection = (event: PromiseRejectionEvent) => {
      if (!isClientFetchNetworkError(event.reason)) return;
      event.preventDefault();
    };

    window.addEventListener("unhandledrejection", onRejection);
    return () => window.removeEventListener("unhandledrejection", onRejection);
  }, []);

  return null;
}
