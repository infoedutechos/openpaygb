"use client";

import Image from "next/image";
import type { SocialLinkDisplay } from "@/lib/site-ui-shared";

function iconForKey(key: string): string {
  if (key.includes("whatsapp")) return "WA";
  if (key.includes("telegram")) return "TG";
  if (key === "twitter") return "X";
  if (key === "youtube") return "YT";
  if (key === "tiktok") return "TT";
  if (key === "facebook") return "f";
  if (key === "instagram") return "IG";
  if (key === "linkedin") return "in";
  if (key === "discord") return "DC";
  return "↗";
}

type Props = {
  links: SocialLinkDisplay[];
  className?: string;
  size?: "sm" | "md";
};

export function SocialLinksRow({ links, className = "", size = "md" }: Props) {
  const active = links.filter((l) => l.enabled && l.url.trim());
  if (active.length === 0) return null;

  const btn =
    size === "sm"
      ? "inline-flex h-8 min-w-[2rem] items-center justify-center rounded-lg border border-white/10 bg-white/[0.06] px-2 text-[10px] font-bold text-slate-200 hover:border-cyan-400/35 hover:bg-cyan-500/10 hover:text-cyan-100 transition-colors"
      : "inline-flex h-9 min-w-[2.25rem] items-center justify-center rounded-xl border border-white/12 bg-white/[0.06] px-2.5 text-[11px] font-bold text-slate-100 hover:border-cyan-400/40 hover:bg-cyan-500/12 hover:text-cyan-50 transition-colors";

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`} role="list" aria-label="Community links">
      {active.map((link) => (
        <a
          key={link.key}
          href={link.url.trim()}
          target="_blank"
          rel="noopener noreferrer"
          className={btn}
          title={link.label}
          role="listitem"
        >
          {link.iconUrl ? (
            <Image
              src={link.iconUrl}
              alt=""
              width={20}
              height={20}
              unoptimized
              className="h-5 w-5 object-contain"
            />
          ) : (
            <span aria-hidden>{iconForKey(link.key)}</span>
          )}
          <span className="sr-only">{link.label}</span>
        </a>
      ))}
    </div>
  );
}
