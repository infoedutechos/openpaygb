"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { readJsonResponse } from "@/utils/read-json-response";
import { getTelegramWebApp } from "@/utils/telegram-webapp";
import { BUILTIN_PLAY_HUB_TARGET_ID } from "@/lib/play-hub-launch-targets";

export type PublicPlayHubLaunchTarget = {
  id: string;
  label: string;
  url: string;
  kind: "internal" | "telegram_webapp" | "external" | "iframe";
  isActive: boolean;
  openMode: "same_tab" | "new_tab" | "telegram" | "iframe";
  notes: string;
};

type PublicPayload = {
  active: PublicPlayHubLaunchTarget | null;
  targets: PublicPlayHubLaunchTarget[];
  botFatherHint?: string;
};

function resolveAbsoluteUrl(url: string): string {
  if (url.startsWith("/")) {
    if (typeof window === "undefined") return url;
    return `${window.location.origin}${url}`;
  }
  return url;
}

export function openPlayHubLaunchTarget(target: PublicPlayHubLaunchTarget) {
  const abs = resolveAbsoluteUrl(target.url);
  const tg = getTelegramWebApp() as
    | (ReturnType<typeof getTelegramWebApp> & {
        openLink?: (url: string, options?: { try_instant_view?: boolean }) => void;
        openTelegramLink?: (url: string) => void;
      })
    | undefined;

  if (target.openMode === "iframe" || target.kind === "iframe") {
    return { mode: "iframe" as const, url: abs, target };
  }

  if (target.kind === "internal" || target.openMode === "same_tab") {
    if (target.url === "/clicker" || target.url.startsWith("/clicker?")) {
      return { mode: "builtin" as const, url: target.url, target };
    }
    window.location.assign(abs);
    return { mode: "navigated" as const, url: abs, target };
  }

  if (target.openMode === "telegram" || target.kind === "telegram_webapp") {
    try {
      if (abs.includes("t.me/") && typeof tg?.openTelegramLink === "function") {
        tg.openTelegramLink(abs);
        return { mode: "telegram" as const, url: abs, target };
      }
      if (typeof tg?.openLink === "function") {
        tg.openLink(abs, { try_instant_view: false });
        return { mode: "telegram" as const, url: abs, target };
      }
    } catch {
      // fall through
    }
  }

  window.open(abs, "_blank", "noopener,noreferrer");
  return { mode: "new_tab" as const, url: abs, target };
}

type PlayHubLaunchContextValue = {
  loading: boolean;
  error: string | null;
  targets: PublicPlayHubLaunchTarget[];
  active: PublicPlayHubLaunchTarget | null;
  selected: PublicPlayHubLaunchTarget | null;
  showSwitcher: boolean;
  iframeUrl: string | null;
  setIframeUrl: (url: string | null) => void;
  selectTarget: (target: PublicPlayHubLaunchTarget) => ReturnType<typeof openPlayHubLaunchTarget>;
  reload: () => Promise<void>;
};

const PlayHubLaunchContext = createContext<PlayHubLaunchContextValue | null>(null);

export function PlayHubLaunchProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<PublicPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [iframeUrl, setIframeUrl] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await fetch("/api/public/play-hub-launch", { cache: "no-store" });
    const parsed = await readJsonResponse<PublicPayload>(r);
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }
    setData(parsed.data);
    setError(null);
    const active = parsed.data.active;
    if (active) {
      setSelectedId(active.id);
      if (active.kind === "iframe" || active.openMode === "iframe") {
        setIframeUrl(resolveAbsoluteUrl(active.url));
      } else {
        setIframeUrl(null);
      }
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const targets = data?.targets ?? [];
  const active = data?.active ?? null;
  const selected = useMemo(
    () => targets.find((t) => t.id === selectedId) ?? active,
    [targets, selectedId, active],
  );

  const selectTarget = useCallback((target: PublicPlayHubLaunchTarget) => {
    setSelectedId(target.id);
    const result = openPlayHubLaunchTarget(target);
    if (result.mode === "iframe") {
      setIframeUrl(result.url);
    } else if (result.mode === "builtin") {
      setIframeUrl(null);
    }
    return result;
  }, []);

  const value: PlayHubLaunchContextValue = {
    loading: data === null && error === null,
    error,
    targets,
    active,
    selected,
    showSwitcher: targets.length > 1,
    iframeUrl,
    setIframeUrl,
    selectTarget,
    reload: load,
  };

  return <PlayHubLaunchContext.Provider value={value}>{children}</PlayHubLaunchContext.Provider>;
}

export function usePlayHubLaunch() {
  const ctx = useContext(PlayHubLaunchContext);
  if (!ctx) {
    throw new Error("usePlayHubLaunch must be used within PlayHubLaunchProvider");
  }
  return ctx;
}

type SwitcherProps = {
  compact?: boolean;
  className?: string;
};

/** Compact game-URL switcher for Play Hub home / settings. */
export function PlayHubLaunchSwitcher({ compact = false, className = "" }: SwitcherProps) {
  const { loading, error, targets, selected, showSwitcher, selectTarget, iframeUrl, setIframeUrl } =
    usePlayHubLaunch();

  if (loading || error || !showSwitcher) {
    return null;
  }

  return (
    <div className={`rounded-xl border border-[#d9a63a]/35 bg-black/35 ${compact ? "p-2.5" : "p-3"} ${className}`}>
      <div className="flex items-center justify-between gap-2">
        <p className={`font-semibold text-[#f3ba2f] ${compact ? "text-[11px]" : "text-xs"}`}>
          Switch game / URL
        </p>
        {iframeUrl ? (
          <button
            type="button"
            onClick={() => setIframeUrl(null)}
            className="text-[10px] font-semibold uppercase tracking-wide text-slate-300 underline-offset-2 hover:underline"
          >
            Back to URAPearls
          </button>
        ) : null}
      </div>
      <div className={`mt-2 flex flex-wrap gap-1.5 ${compact ? "" : "gap-2"}`}>
        {targets.map((t) => {
          const isSel = selected?.id === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => selectTarget(t)}
              className={`rounded-lg border px-2.5 py-1.5 text-left text-[11px] font-semibold transition-colors ${
                isSel
                  ? "border-[#f3ba2f]/70 bg-[#f3ba2f]/20 text-[#ffe9a8]"
                  : "border-white/15 bg-white/5 text-slate-200 hover:border-white/30"
              }`}
              title={t.url}
            >
              {t.label}
              {t.isActive ? (
                <span className="ml-1 text-[9px] uppercase tracking-wide text-[#f3ba2f]/80">· primary</span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Full-bleed iframe host when an iframe launch target is selected. */
export function PlayHubLaunchIframeHost() {
  const { iframeUrl, setIframeUrl, showSwitcher, targets, selectTarget } = usePlayHubLaunch();

  if (!iframeUrl) return null;

  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-[#0b1220]">
      <div className="flex items-center gap-2 border-b border-white/10 bg-black/70 px-3 py-2">
        <button
          type="button"
          onClick={() => {
            setIframeUrl(null);
            const builtin = targets.find((t) => t.id === BUILTIN_PLAY_HUB_TARGET_ID);
            if (builtin) selectTarget(builtin);
          }}
          className="rounded-lg border border-white/20 px-2.5 py-1 text-xs font-semibold text-white"
        >
          ← URAPearls
        </button>
        {showSwitcher ? (
          <div className="flex min-w-0 flex-1 gap-1 overflow-x-auto">
            {targets.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => selectTarget(t)}
                className="shrink-0 rounded-md border border-white/15 px-2 py-1 text-[10px] text-slate-200"
              >
                {t.label}
              </button>
            ))}
          </div>
        ) : (
          <p className="truncate text-xs text-slate-400">Embedded game</p>
        )}
      </div>
      <iframe
        title="Play Hub game"
        src={iframeUrl}
        className="h-full w-full flex-1 border-0 bg-black"
        allow="fullscreen; payment; clipboard-read; clipboard-write"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-downloads"
      />
    </div>
  );
}
