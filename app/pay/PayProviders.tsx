"use client";

import dynamic from "next/dynamic";

const TonConnectShell = dynamic(
  () => import("@/components/TonConnectShell").then((m) => ({ default: m.TonConnectShell })),
  {
    ssr: false,
    loading: () => (
      <div className="mx-auto max-w-lg px-4 pt-8 text-center text-sm text-slate-500">Loading wallet…</div>
    ),
  },
);

export function PayProviders({ children }: { children: React.ReactNode }) {
  return <TonConnectShell>{children}</TonConnectShell>;
}
