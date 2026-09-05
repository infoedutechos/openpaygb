"use client";

import { AdvertisePanel } from "@/components/ads/AdvertisePanel";
import { AdSlot } from "@/components/ads/AdSlot";

export default function StaffAdvertisePage() {
  return (
    <div className="space-y-6">
      <AdvertisePanel
        listUrl="/api/staff/ads"
        createUrl="/api/staff/ads"
        title="Advertise"
        subtitle="Staff campaigns for school and platform placements."
      />
      <AdSlot placement="web_dashboard_sidebar" hub="schools" />
    </div>
  );
}
