"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  IconAdmin,
  IconDex,
  IconHome,
  IconPay,
  IconPlayHub,
  IconProgrammes,
  IconReceipt,
  IconWorkspace,
} from "@/components/hub/tuition-nav-icons";
import { payProgrammesHref, payTenantBasePath } from "@/lib/tuition-nav";

type ActiveMatch = "lobby" | "programmes" | "pay" | "receipt" | "workspace" | "admin" | "play" | "dex";

function activeKey(pathname: string, searchParams: URLSearchParams): ActiveMatch | null {
  if (pathname.startsWith("/dex")) return "dex";
  if (pathname === "/admin/register" || pathname.startsWith("/admin/register/")) return "workspace";
  if (pathname === "/pay" || pathname.startsWith("/pay/")) {
    if (searchParams.get("programmes") === "1") return "programmes";
    return "pay";
  }
  if (pathname === "/receipt" || pathname.startsWith("/receipt/")) return "receipt";
  if (pathname.startsWith("/admin")) return "admin";
  if (pathname === "/") return "lobby";
  return null;
}

function rowClass(active: boolean) {
  return `flex w-full max-w-[4.75rem] flex-col items-center justify-center rounded-2xl px-0.5 py-1.5 transition-colors sm:max-w-[5.25rem] ${
    active ? "bg-cyan-900/50 text-white ring-1 ring-cyan-400/35" : "text-slate-400 hover:text-slate-200"
  }`;
}

function NavInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const hub = searchParams.get("hub");
  const payBase = payTenantBasePath(pathname);
  const programmesHref = payProgrammesHref(pathname);
  const key = activeKey(pathname ?? "", searchParams);
  const lobbyActive = pathname === "/" && hub !== "play" && hub !== "dex" && key === "lobby";

  const ITEMS = [
    { name: "Lobby", href: "/?hub=tuition", icon: IconHome, activeMatch: "lobby" as const },
    { name: "Programmes", href: programmesHref, icon: IconProgrammes, activeMatch: "programmes" as const },
    { name: "Pay", href: payBase, icon: IconPay, activeMatch: "pay" as const },
    { name: "Receipt", href: "/receipt", icon: IconReceipt, activeMatch: "receipt" as const },
    {
      name: "Register",
      href: "/admin/register",
      icon: IconWorkspace,
      activeMatch: "workspace" as const,
      ariaLabel: "Request school workspace — self-register on our platform",
    },
    { name: "Dex", href: "/dex", icon: IconDex, activeMatch: "dex" as const },
    { name: "School admin", href: "/school/login", icon: IconAdmin, activeMatch: "admin" as const },
    { name: "Play", href: "/clicker", icon: IconPlayHub, activeMatch: "play" as const },
  ];

  return (
    <nav
      className="flex w-full justify-around overflow-x-auto px-0.5 pb-[max(0.35rem,env(safe-area-inset-bottom))] pt-1 text-xs text-white"
      aria-label="Tuition Hub"
    >
      {ITEMS.map((item) => {
        let active = key === item.activeMatch;
        if (item.activeMatch === "lobby") active = lobbyActive;
        const Icon = item.icon;
        return (
          <Link
            key={item.name}
            href={item.href}
            prefetch={item.href.startsWith("/clicker")}
            aria-label={item.ariaLabel ?? item.name}
            className="flex min-w-0 shrink-0 flex-1 flex-col items-center justify-center rounded-2xl py-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50"
          >
            <span className={rowClass(active)}>
              <span className="flex h-8 w-8 items-center justify-center">
                <Icon className="h-[22px] w-[22px]" />
              </span>
              <span className="mt-0.5 truncate text-[10px] font-medium leading-tight sm:text-[11px]">{item.name}</span>
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

type Props = {
  /** `fixed` for /pay and /receipt layouts; `slot` when nested inside HomeHubShell */
  mode?: "fixed" | "slot";
};

function NavFallback() {
  return (
    <nav
      className="flex h-12 w-full justify-around px-1 pb-[max(0.35rem,env(safe-area-inset-bottom))] pt-1"
      aria-hidden
    >
      {Array.from({ length: 8 }).map((_, i) => (
        <span key={i} className="mx-0.5 h-8 w-8 shrink-0 rounded-xl bg-white/5" />
      ))}
    </nav>
  );
}

export default function TuitionHubBottomNav({ mode = "fixed" }: Props) {
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
      className="fixed bottom-0 left-1/2 z-50 w-full max-w-xl -translate-x-1/2 border-t border-cyan-900/50 bg-[rgb(8_18_32_/_0.97)] px-0 pt-0 shadow-[0_-8px_24px_rgba(0,0,0,0.35)] backdrop-blur-md"
      role="presentation"
    >
      {inner}
    </div>
  );
}
