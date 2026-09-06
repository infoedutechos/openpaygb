"use client";

import { useCallback, useState } from "react";
import {
  SHARE_CHANNELS,
  buildSharePayload,
  copyShareLink,
  openShareUrl,
  shareChannelUrl,
  triggerNativeShare,
  type ShareChannel,
} from "@/lib/social-share";
import { usePlatformSocial } from "@/components/PlatformSocialProvider";

function telegramWebApp() {
  if (typeof window === "undefined") return undefined;
  return (
    window as unknown as {
      Telegram?: { WebApp?: { openLink?: (u: string, o?: { try_instant_view?: boolean }) => void } };
    }
  ).Telegram?.WebApp;
}

type Props = {
  open: boolean;
  onClose: () => void;
  /** Page URL to share; defaults to current location */
  shareUrl?: string;
  title?: string;
  text?: string;
  className?: string;
};

export function ShareSheet({ open, onClose, shareUrl, title, text, className = "" }: Props) {
  const platform = usePlatformSocial();
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  const resolvedUrl =
    shareUrl?.trim() ||
    (typeof window !== "undefined" ? window.location.href : process.env.NEXT_PUBLIC_APP_URL?.trim() || "");

  const payload = buildSharePayload(resolvedUrl, {
    title: title ?? platform.shareDefaultTitle,
    text: text ?? platform.shareDefaultText,
  });

  const handleChannel = useCallback(
    async (channel: ShareChannel) => {
      if (busy) return;
      setBusy(true);
      setCopied(false);
      try {
        if (channel === "native") {
          const ok = await triggerNativeShare(payload);
          if (ok) {
            onClose();
            return;
          }
        }
        if (channel === "copy") {
          const ok = await copyShareLink(payload.url);
          setCopied(ok);
          if (ok) setTimeout(() => onClose(), 800);
          return;
        }
        const href = shareChannelUrl(channel, payload);
        if (href) {
          openShareUrl(href, telegramWebApp());
          onClose();
        }
      } finally {
        setBusy(false);
      }
    },
    [busy, onClose, payload],
  );

  if (!open) return null;

  return (
    <>
      <div
        className={`fixed inset-0 z-[200] flex items-end justify-center sm:items-center ${className}`}
        role="dialog"
        aria-modal="true"
        aria-label="Share"
      >
        <button
          type="button"
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          aria-label="Close share"
          onClick={onClose}
        />
        <div className="relative z-10 w-full max-w-md rounded-t-2xl border border-white/10 bg-[#12151c] p-4 shadow-2xl sm:rounded-2xl sm:mx-4">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <h2 className="text-base font-semibold text-white">Share ODELPay HUB</h2>
              <p className="mt-1 text-xs text-slate-500 line-clamp-2 break-all">{payload.url}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-lg px-2 py-1 text-xs text-slate-400 hover:bg-white/10 hover:text-white"
            >
              Close
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {SHARE_CHANNELS.map((ch) => (
              <button
                key={ch.id}
                type="button"
                disabled={busy}
                onClick={() => void handleChannel(ch.id)}
                className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-3 text-xs font-semibold text-slate-200 hover:border-cyan-400/35 hover:bg-cyan-500/10 hover:text-cyan-50 disabled:opacity-50 transition-colors"
              >
                {ch.id === "copy" && copied ? "Copied!" : ch.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
