import type { Metadata } from "next";
import { DeveloperDashboard } from "@/components/developers/DeveloperDashboard";

export const metadata: Metadata = {
  title: "Developer dashboard",
  description: "Manage Partner API keys, webhooks, and OPGB/Dex integrator settings.",
};

export default function DeveloperDashboardPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <DeveloperDashboard />
    </div>
  );
}
