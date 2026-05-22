"use client";

import { useState } from "react";
import { ShareSheet } from "@/components/ShareSheet";
import { usePlatformSocial } from "@/components/PlatformSocialProvider";

type Props = {
  shareUrl?: string;
  title?: string;
  text?: string;
  className?: string;
  label?: string;
  variant?: "primary" | "ghost" | "compact";
};

export function ShareButton({
  shareUrl,
  title,
  text,
  className = "",
  label = "Share",
  variant = "ghost",
}: Props) {
  const platform = usePlatformSocial();
  const [open, setOpen] = useState(false);

  if (!platform.shareEnabled) return null;

  const base =
    variant === "primary"
      ? "rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-violet-900/30 hover:brightness-110"
      : variant === "compact"
        ? "rounded-lg border border-white/12 bg-white/[0.06] px-2.5 py-1.5 text-[11px] font-semibold text-slate-200 hover:border-violet-400/40 hover:text-violet-100"
        : "rounded-xl border border-violet-400/30 bg-violet-500/10 px-4 py-2 text-sm font-semibold text-violet-100 hover:border-violet-300/50 hover:bg-violet-500/20";

  return (
    <>
      <button type="button" className={`${base} ${className}`} onClick={() => setOpen(true)}>
        {label}
      </button>
      <ShareSheet
        open={open}
        onClose={() => setOpen(false)}
        shareUrl={shareUrl}
        title={title}
        text={text}
      />
    </>
  );
}
