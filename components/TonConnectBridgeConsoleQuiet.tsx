"use client";

import { useLayoutEffect } from "react";
import { isTonConnectBridgeConsoleNoise } from "@/lib/tonconnect-ui-options";

function shouldSuppressConsoleArgs(args: unknown[]): boolean {
  const text = args
    .map((a) => {
      if (typeof a === "string") return a;
      if (a instanceof Error) return a.message;
      try {
        return JSON.stringify(a);
      } catch {
        return String(a);
      }
    })
    .join(" ");
  return isTonConnectBridgeConsoleNoise(text);
}

/**
 * In development, filters console noise from third-party wallet HTTP bridges
 * (CORS / 522 / HTTP2) that TonConnect probes when the wallet modal opens.
 */
export function TonConnectBridgeConsoleQuiet() {
  useLayoutEffect(() => {
    if (process.env.NODE_ENV !== "development") return;

    const wrap =
      (original: typeof console.error) =>
      (...args: unknown[]) => {
        if (shouldSuppressConsoleArgs(args)) return;
        original.apply(console, args as Parameters<typeof console.error>);
      };

    const error = console.error;
    const warn = console.warn;
    const log = console.log;
    console.error = wrap(error);
    console.warn = wrap(warn);
    console.log = wrap(log);

    return () => {
      console.error = error;
      console.warn = warn;
      console.log = log;
    };
  }, []);

  return null;
}
