"use client";

import { AdvertisePanel } from "@/components/ads/AdvertisePanel";
import { useSchoolAdminApi } from "@/hooks/useSchoolAdminApi";

export default function SchoolAdvertisePage() {
  const { organizationSlug } = useSchoolAdminApi();
  const q = organizationSlug ? `?organizationSlug=${encodeURIComponent(organizationSlug)}` : "";
  return (
    <AdvertisePanel
      listUrl={`/api/admin/ads${q}`}
      createUrl="/api/admin/ads"
      extraBody={{ organizationSlug }}
      title="Advertise"
      subtitle="Promote your school on web dashboards and Telegram. Campaigns go to Master Admin for approval unless auto-approve is enabled."
    />
  );
}
