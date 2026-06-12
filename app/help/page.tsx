import type { Metadata } from "next";
import { Suspense } from "react";
import HelpCenterBrowse from "@/components/help/HelpCenterBrowse";

export const metadata: Metadata = {
  title: "Help center — Ecosystem FAQ",
  description:
    "Live searchable FAQ for ODEL HUB — tuition, OpenPayGB & Dex, school admin, developers, and URAPearls.",
};

export default function HelpCenterPage() {
  return (
    <Suspense fallback={<p className="p-8 text-sm text-slate-500">Loading help center…</p>}>
      <HelpCenterBrowse />
    </Suspense>
  );
}
