import { Suspense } from "react";
import { HubMaintenanceGate } from "@/components/hub/HubMaintenanceGate";
import TuitionHubBottomNav from "@/components/hub/TuitionHubBottomNav";
import { TuitionHubMobileMenu } from "@/components/hub/TuitionHubMobileMenu";

export default function PayLayout({ children }: { children: React.ReactNode }) {
  return (
    <HubMaintenanceGate hub="tuition">
      <div className="pb-28">
        <TuitionHubMobileMenu title="Pay tuition" subtitle="Checkout · programmes · receipts" />
        {children}
        <Suspense fallback={null}>
          <TuitionHubBottomNav />
        </Suspense>
      </div>
    </HubMaintenanceGate>
  );
}
