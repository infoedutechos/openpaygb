"use client";

import Image from "next/image";
import { usePlatformSocial } from "@/components/PlatformSocialProvider";

export function HelpCopilotBubbleIcon({ className = "h-11 w-11" }: { className?: string }) {
  const { copilotBubbleImageUrl } = usePlatformSocial();

  if (copilotBubbleImageUrl) {
    return (
      <span
        className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-ura-navy/30 ${className}`}
        aria-hidden
      >
        <Image
          src={copilotBubbleImageUrl}
          alt=""
          width={44}
          height={44}
          unoptimized
          className="h-full w-full object-cover"
        />
      </span>
    );
  }

  return (
    <span
      className={`flex items-center justify-center rounded-full bg-ura-navy/30 text-[1.35rem] leading-none ${className}`}
      aria-hidden
    >
      💬
    </span>
  );
}
