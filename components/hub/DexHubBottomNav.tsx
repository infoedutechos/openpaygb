"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconDex,
  IconPay,
  IconPlayHub,
  IconRampIn,
  IconRampOut,
} from "@/components/hub/tuition-nav-icons";
import { HUBS } from "@/lib/ecosystem/hubs";

type DexTab = "home" | "onramp" | "offramp" | "convert";

function tabFromPath(pathname: string | null): DexTab {
  if (!pathname) return "home";
  if (pathname.startsWith("/dex/onramp")) return "onramp";
  if (pathname.startsWith("/dex/offramp")) return "offramp";
  if (pathname.startsWith("/dex/convert")) return "convert";
  return "home";
}

function rowClass(active: boolean) {
  return `flex w-full max-w-[5rem] flex-col items-center justify-center rounded-2xl px-0.5 py-1.5 transition-colors sm:max-w-[5.5rem] ${
    active
      ? "bg-violet-900/45 text-white ring-1 ring-violet-400/35"
      : "text-slate-400 hover:text-slate-200"
  }`;
}

const ITEMS: {
  id: DexTab | "pay" | "play";
  name: string;
  href: string;
  icon: typeof IconDex;
  tab?: DexTab;
}[] = [
  { id: "home", name: "Hub", href: "/dex", icon: IconDex, tab: "home" },
  { id: "onramp", name: "Onramp", href: HUBS.dex.routes!.onramp!, icon: IconRampIn, tab: "onramp" },
  { id: "offramp", name: "Offramp", href: HUBS.dex.routes!.offramp!, icon: IconRampOut, tab: "offramp" },
  { id: "convert", name: "Convert", href: HUBS.dex.routes!.convert!, icon: IconDex, tab: "convert" },
  { id: "pay", name: "Pay", href: HUBS.tuition.basePath, icon: IconPay },
  { id: "play", name: "Play", href: HUBS.play.basePath, icon: IconPlayHub },
];

type Props = { mode?: "fixed" | "slot" };

function NavInner() {
  const pathname = usePathname();
  const tab = tabFromPath(pathname);

  return (
    <nav
      className="flex w-full justify-around overflow-x-auto px-0.5 pb-[max(0.35rem,env(safe-area-inset-bottom))] pt-1 text-xs text-white"
      aria-label="Dex Hub"
    >
      {ITEMS.map((item) => {
        const Icon = item.icon;
        const active = item.tab !== undefined ? tab === item.tab : false;
        return (
          <Link
            key={item.id}
            href={item.href}
            prefetch={item.href.startsWith("/clicker")}
            className="flex min-w-0 shrink-0 flex-1 flex-col items-center justify-center rounded-2xl py-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/50"
          >
            <span className={rowClass(active)}>
              <span className="flex h-8 w-8 items-center justify-center">
                <Icon className="h-[22px] w-[22px]" />
              </span>
              <span className="mt-0.5 truncate px-0.5 text-[10px] font-medium leading-tight sm:text-[11px]">
                {item.name}
              </span>
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

export default function DexHubBottomNav({ mode = "fixed" }: Props) {
  const inner = <NavInner />;
  if (mode === "slot") {
    return inner;
  }
  return (
    <div
      className="fixed bottom-0 left-1/2 z-50 w-full max-w-xl -translate-x-1/2 border-t border-violet-900/50 bg-[rgb(12_10_28_/_0.97)] px-0 pt-0 shadow-[0_-8px_24px_rgba(0,0,0,0.35)] backdrop-blur-md"
      role="presentation"
    >
      {inner}
    </div>
  );
}
