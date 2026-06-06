import { Suspense } from "react";
import { HubMaintenanceGate } from "@/components/hub/HubMaintenanceGate";
import TuitionHubBottomNav from "@/components/hub/TuitionHubBottomNav";

export default function ReceiptLayout({ children }: { children: React.ReactNode }) {
  return (
    <HubMaintenanceGate hub="tuition">
      <div className="pb-28">
        {children}
        <Suspense fallback={null}>
          <TuitionHubBottomNav />
        </Suspense>
      </div>
    </HubMaintenanceGate>
  );
}
