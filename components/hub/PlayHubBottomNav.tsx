"use client";

import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { IconDex } from "@/components/hub/tuition-nav-icons";
import { navHome, navLearn, navServices, earnRewardsIcon, navGuild } from "@/images";
import type { StaticImageData } from "next/image";
import { useStandaloneApp } from "@/components/standalone/StandaloneAppProvider";
import { useHubVisibility } from "@/components/hub/HubVisibilityProvider";

type NavEntry =
  | {
      kind: "home";
      name: string;
      image: StaticImageData;
      hrefPlayLanding: string;
      hrefClicker: string;
    }
  | { kind: "view"; name: string; image: StaticImageData; href: string }
  | { kind: "dex"; name: string; href: string };

const NAV_ITEMS: NavEntry[] = [
  { kind: "home", name: "Home", image: navHome, hrefPlayLanding: "/?hub=play", hrefClicker: "/clicker" },
  { kind: "view", name: "Learn", image: navLearn, href: "/clicker?view=eearn" },
  { kind: "view", name: "Services", image: navServices, href: "/clicker?view=services" },
  { kind: "view", name: "Earn", image: earnRewardsIcon, href: "/clicker?view=earn" },
  { kind: "view", name: "Guild", image: navGuild, href: "/clicker?view=guild" },
  { kind: "dex", name: "Dex", href: "/dex" },
];

function NavInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { app } = useStandaloneApp();
  const hubHidden = useHubVisibility();
  const hub = searchParams.get("hub");
  const view = searchParams.get("view");
  const onPlayLanding = pathname === "/" && hub === "play";
  const onClicker = pathname.startsWith("/clicker");
  const onDex = pathname.startsWith("/dex");
  const navItems = NAV_ITEMS.filter((item) => {
    if (item.kind === "dex" && (app?.hideEcosystemLinks || hubHidden.dex)) return false;
    return true;
  });
  const homeClickerHref = app?.lobbyPath ?? "/clicker";

  return (
    <nav
      className="flex w-full justify-around overflow-x-auto px-0.5 pb-[max(0.35rem,env(safe-area-inset-bottom))] pt-1 text-xs text-white"
      aria-label="Play Hub"
    >
      {navItems.map((item) => {
        if (item.kind === "dex") {
          const active = onDex;
          return (
            <Link
              key={item.name}
              href={item.href}
              prefetch
              className="flex min-w-0 shrink-0 flex-1 flex-col items-center justify-center rounded-2xl py-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f3ba2f]/50"
            >
              <span
                className={`flex w-full max-w-[5rem] flex-col items-center justify-center rounded-2xl px-0.5 py-1.5 transition-colors sm:max-w-[5.25rem] ${
                  active ? "bg-ura-panel-3/80 text-white" : "text-gray-400 hover:text-gray-200"
                }`}
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center">
                  <IconDex className="h-[26px] w-[26px]" />
                </span>
                <span className="mt-0.5 truncate text-[10px] font-medium leading-tight sm:text-[11px]">{item.name}</span>
              </span>
            </Link>
          );
        }
        const href =
          item.kind === "home"
            ? app?.hideEcosystemLinks || onClicker
              ? homeClickerHref
              : item.hrefPlayLanding
            : item.href;
        let active = false;
        if (item.kind === "home") {
          active = onPlayLanding || (onClicker && (view == null || view === "" || view === "home"));
        } else if (onClicker) {
          const expected = new URL(item.href, "http://local").searchParams.get("view");
          active = view === expected;
        }
        return (
          <Link
            key={item.name}
            href={href}
            prefetch={item.kind !== "home"}
            className="flex min-w-0 shrink-0 flex-1 flex-col items-center justify-center rounded-2xl py-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f3ba2f]/50"
          >
            <span
              className={`flex w-full max-w-[5rem] flex-col items-center justify-center rounded-2xl px-1 py-1.5 transition-colors sm:max-w-[5.25rem] ${
                active ? "bg-ura-panel-3/80 text-white" : "text-gray-400 hover:text-gray-200"
              }`}
            >
              <span className="relative h-8 w-8 shrink-0">
                <Image src={item.image} alt="" width={32} height={32} className="object-contain" aria-hidden />
              </span>
              <span className="mt-0.5 truncate text-[10px] font-medium leading-tight sm:text-[11px]">{item.name}</span>
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

type Props = { mode?: "fixed" | "slot" };

function NavFallback() {
  return (
    <nav
      className="flex h-12 w-full justify-around px-1 pb-[max(0.35rem,env(safe-area-inset-bottom))] pt-1"
      aria-hidden
    >
      {Array.from({ length: 6 }).map((_, i) => (
        <span key={i} className="mx-1 h-8 w-8 shrink-0 rounded-xl bg-white/5" />
      ))}
    </nav>
  );
}

export default function PlayHubBottomNav({ mode = "fixed" }: Props) {
  const inner = (
    <Suspense fallback={<NavFallback />}>
      <NavInner />
    </Suspense>
  );
  if (mode === "slot") {
    return inner;
  }
  return (
    <div
      className="fixed bottom-0 left-1/2 z-50 w-full max-w-xl -translate-x-1/2 border-t border-ura-border/60 bg-ura-panel-2 shadow-[0_-8px_24px_rgba(0,0,0,0.35)]"
      role="presentation"
    >
      {inner}
    </div>
  );
}
