"use client";

import { AdvertisePanel } from "@/components/ads/AdvertisePanel";
import { AdSlot } from "@/components/ads/AdSlot";

export default function MyAdvertisePage() {
  return (
    <div className="space-y-6">
      <AdvertisePanel
        listUrl="/api/student/ads"
        createUrl="/api/student/ads"
        title="Advertise"
        subtitle="Promote with your OpenPayGB wallet. Live spend debits your OPGB balance when campaigns run."
      />
      <AdSlot placement="web_dashboard_sidebar" hub="tuition" />
    </div>
  );
}
