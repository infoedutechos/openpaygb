"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";
import { ShareSheet } from "@/components/ShareSheet";
import { usePlatformSocial } from "@/components/PlatformSocialProvider";

const HIDE_PREFIXES = [
  "/admin",
  "/school-admin",
  "/api",
  "/pay",
  "/receipt",
  "/student",
  "/my",
  "/dex",
  "/clicker",
  "/help",
] as const;

export function ShareFab() {
  const pathname = usePathname() ?? "";
  const platform = usePlatformSocial();
  const [open, setOpen] = useState(false);

  const hidden =
    pathname === "/" ||
    HIDE_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  if (hidden || !platform.shareEnabled) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed z-[85] bottom-[max(1rem,env(safe-area-inset-bottom))] left-[max(1rem,env(safe-area-inset-left))] flex h-11 items-center gap-2 rounded-full border border-violet-400/35 bg-violet-600/90 pl-3 pr-4 text-xs font-bold text-white shadow-lg shadow-violet-900/40 hover:brightness-110 md:bottom-6"
        aria-label="Share this page"
      >
        <span aria-hidden>⤴</span>
        Share
      </button>
      <ShareSheet open={open} onClose={() => setOpen(false)} />
    </>
  );
}
