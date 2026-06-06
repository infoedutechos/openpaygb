"use client";

import { openPlatformChat } from "@/lib/platform-chat-events";

type Props = {
  variant?: "tuition" | "master" | "student";
  compact?: boolean;
};

export function DashboardChatNavButton({ variant = "tuition", compact = false }: Props) {
  const base =
    variant === "master"
      ? "text-slate-400 hover:bg-white/[0.04] hover:text-white"
      : "text-slate-400 hover:bg-white/5 hover:text-white";

  if (compact) {
    return (
      <button
        type="button"
        onClick={() => openPlatformChat()}
        className="shrink-0 rounded-md px-2 py-2 min-h-[44px] inline-flex items-center text-slate-400 hover:text-white"
      >
        Chat
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => openPlatformChat()}
      className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${base}`}
    >
      Chat
      <span className="block text-[11px] text-slate-600">Help & support</span>
    </button>
  );
}
