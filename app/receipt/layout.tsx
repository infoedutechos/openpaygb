import { Suspense } from "react";
import { HubMaintenanceGate } from "@/components/hub/HubMaintenanceGate";
import TuitionHubBottomNav from "@/components/hub/TuitionHubBottomNav";
import { TuitionHubMobileMenu } from "@/components/hub/TuitionHubMobileMenu";

export default function ReceiptLayout({ children }: { children: React.ReactNode }) {
  return (
    <HubMaintenanceGate hub="tuition">
      <div className="pb-28">
        <TuitionHubMobileMenu title="Receipts" subtitle="Verify · download · ledger" />
        {children}
        <Suspense fallback={null}>
          <TuitionHubBottomNav />
        </Suspense>
      </div>
    </HubMaintenanceGate>
  );
}
