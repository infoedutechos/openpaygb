"use client";

import Image from "next/image";
import { resolveSocialLinkIconUrl } from "@/lib/social-link-brand-icon";
import type { SocialLinkDisplay } from "@/lib/site-ui-shared";

function iconFallbackText(key: string): string {
  if (key.includes("whatsapp")) return "WA";
  if (key.includes("telegram")) return "TG";
  if (key === "twitter") return "X";
  if (key === "youtube") return "YT";
  if (key === "tiktok") return "TT";
  if (key === "facebook") return "f";
  if (key === "instagram") return "IG";
  if (key === "linkedin") return "in";
  if (key === "discord") return "DC";
  if (key === "website") return "Web";
  return "↗";
}

type Props = {
  links: SocialLinkDisplay[];
  className?: string;
  size?: "sm" | "md";
  /** Footer community strip — circular icons + optional short labels */
  variant?: "default" | "community";
};

export function SocialLinksRow({ links, className = "", size = "md", variant = "default" }: Props) {
  const active = links.filter((l) => l.enabled && l.url.trim());
  if (active.length === 0) return null;

  const isCommunity = variant === "community";
  const btn =
    isCommunity
      ? "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/20 bg-slate-950 shadow-md shadow-black/40 transition-transform hover:scale-105 hover:border-cyan-400/50"
      : size === "sm"
        ? "inline-flex h-9 min-w-[2.25rem] items-center justify-center rounded-lg border border-white/10 bg-white/[0.06] px-2 text-[10px] font-bold text-slate-200 hover:border-cyan-400/35 hover:bg-cyan-500/10 hover:text-cyan-100 transition-colors"
        : "inline-flex h-10 min-w-[2.5rem] items-center justify-center rounded-xl border border-white/12 bg-white/[0.06] px-2.5 text-[11px] font-bold text-slate-100 hover:border-cyan-400/40 hover:bg-cyan-500/12 hover:text-cyan-50 transition-colors";

  return (
    <div
      className={`flex flex-wrap items-center gap-3 ${className}`}
      role="list"
      aria-label="Community links"
    >
      {active.map((link) => {
        const iconSrc = resolveSocialLinkIconUrl(link.key, link.iconUrl);
        return (
          <a
            key={link.key}
            href={link.url.trim()}
            target="_blank"
            rel="noopener noreferrer"
            className={isCommunity ? "group flex flex-col items-center gap-1.5" : btn}
            title={link.label}
            role="listitem"
          >
            <span className={isCommunity ? btn : undefined}>
              {iconSrc ? (
                <Image
                  src={iconSrc}
                  alt=""
                  width={22}
                  height={22}
                  unoptimized
                  className="h-[22px] w-[22px] object-contain"
                />
              ) : (
                <span className="text-xs font-bold text-cyan-200" aria-hidden>
                  {iconFallbackText(link.key)}
                </span>
              )}
            </span>
            {isCommunity ? (
              <span className="max-w-[4.5rem] truncate text-center text-[10px] font-medium text-slate-300 group-hover:text-cyan-200">
                {link.label.split(" ")[0]}
              </span>
            ) : (
              <span className="sr-only">{link.label}</span>
            )}
          </a>
        );
      })}
    </div>
  );
}
