"use client";

import { isLocalTonConnectHost } from "@/lib/tonconnect-local-wallets";

/** Shown on localhost only — explains harmless TON Connect bridge console noise. */
export function TonConnectDevBridgeNotice({ className = "" }: { className?: string }) {
  if (process.env.NODE_ENV !== "development") return null;
  if (typeof window === "undefined" || !isLocalTonConnectHost(window.location.hostname)) {
    return null;
  }

  return (
    <div
      className={`rounded-xl border border-slate-600/50 bg-slate-900/80 px-3 py-2 text-left text-[11px] leading-relaxed text-slate-400 ${className}`}
      role="status"
    >
      <p className="font-medium text-slate-300">Local dev: TON Connect bridge messages</p>
      <p className="mt-1">
        Console errors for <span className="font-mono text-slate-500">go-bridge.tomo.inc</span>,{" "}
        <span className="font-mono text-slate-500">bridge.mirai.app</span>, or{" "}
        <span className="font-mono text-slate-500">nicegram.app</span> are from wallet infrastructure (CORS /
        522), not this app. Use <strong className="text-slate-300">Tonkeeper</strong>,{" "}
        <strong className="text-slate-300">MyTonWallet</strong>, or{" "}
        <strong className="text-slate-300">Wallet in Telegram</strong> in the connect modal — payment still
        works via Ton Pay after connect.
      </p>
    </div>
  );
}

