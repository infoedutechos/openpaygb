import type { Metadata } from "next";
import { Suspense } from "react";
import HelpCenterWorkspace from "@/components/help/HelpCenterWorkspace";

export const metadata: Metadata = {
  title: "Help center — Ask anything",
  description:
    "ODEL HUB Help Center — ask the knowledge-base copilot about tuition, OpenPayGB, Dex, school admin, and more.",
};

export default function HelpCenterPage() {
  return (
    <Suspense fallback={<p className="p-8 text-sm text-slate-500">Loading help center…</p>}>
      <HelpCenterWorkspace />
    </Suspense>
  );
}
