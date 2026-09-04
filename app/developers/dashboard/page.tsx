import type { Metadata } from "next";
import { DeveloperDashboard } from "@/components/developers/DeveloperDashboard";

export const metadata: Metadata = {
  title: "Developer dashboard",
  description: "Manage Partner API keys, webhooks, and OPGB/Dex integrator settings.",
};

export default function DeveloperDashboardPage() {
  return (
    <div className="mx-auto max-w-5xl px-0 py-2 md:py-4">
      <DeveloperDashboard />
    </div>
  );
}
