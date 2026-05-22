"use client";

import { useCallback, useEffect, useState } from "react";
import { usePlatformSocial } from "@/components/PlatformSocialProvider";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as Window & { MSStream?: unknown }).MSStream;
}

export function SaveToHomeScreenCard() {
  const platform = usePlatformSocial();
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    setInstalled(isStandalone());
  }, []);

  useEffect(() => {
    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };
    window.addEventListener("beforeinstallprompt", onBip);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBip);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const install = useCallback(async () => {
    if (!deferred) return;
    await deferred.prompt();
    const choice = await deferred.userChoice;
    if (choice.outcome === "accepted") {
      setInstalled(true);
      setDeferred(null);
    }
  }, [deferred]);

  if (!platform.homeScreenEnabled || !platform.homeScreenShowOnHome || installed) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/40 to-[#0d1526]/80 p-5 shadow-lg shadow-emerald-900/20">
      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-300/90">Save on device</p>
      <h2 className="mt-2 text-lg font-semibold text-white">{platform.homeScreenTitle}</h2>
      <p className="mt-2 text-sm leading-relaxed text-slate-400">{platform.homeScreenDescription}</p>

      {deferred ? (
        <button
          type="button"
          onClick={() => void install()}
          className="mt-4 w-full rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 px-4 py-3 text-sm font-semibold text-slate-950 hover:brightness-110"
        >
          Install on desktop / home screen
        </button>
      ) : isIos() ? (
        <p className="mt-4 rounded-lg border border-white/10 bg-black/30 px-3 py-2.5 text-xs text-slate-300">
          On iPhone/iPad: tap <strong className="text-white">Share</strong> in Safari, then{" "}
          <strong className="text-white">Add to Home Screen</strong>.
        </p>
      ) : (
        <p className="mt-4 rounded-lg border border-white/10 bg-black/30 px-3 py-2.5 text-xs text-slate-300">
          In Chrome or Edge: open the browser menu and choose <strong className="text-white">Install app</strong> or{" "}
          <strong className="text-white">Add to Home screen</strong>. You can also bookmark this page.
        </p>
      )}
    </div>
  );
}
