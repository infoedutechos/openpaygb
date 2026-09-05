"use client";

import { AdvertisePanel } from "@/components/ads/AdvertisePanel";

/** Partner self-serve ads UI (API key auth via Partner API still preferred for automation). */
export default function PartnerAdvertisePage() {
  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 py-8">
      <p className="text-sm text-slate-400">
        Partners typically create ads via{" "}
        <code className="text-violet-300">POST /api/partner/v1/ads</code> with scopes{" "}
        <code className="text-violet-300">ads:read</code> / <code className="text-violet-300">ads:write</code>.
        School and student dashboards use cookie sessions below for demos.
      </p>
      <AdvertisePanel
        listUrl="/api/admin/ads"
        createUrl="/api/admin/ads"
        title="Partner advertise (org session)"
        subtitle="Signed-in org admins can submit here; automated partners should use the Partner API."
      />
    </div>
  );
}
