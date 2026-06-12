import { HubMaintenanceGate } from "@/components/hub/HubMaintenanceGate";
import { HomeHubShell } from "@/components/hub/HomeHubShell";

export default function OdelPayUniversitiesLayout({ children }: { children: React.ReactNode }) {
  return (
    <HubMaintenanceGate hub="tuition">
      <HomeHubShell>{children}</HomeHubShell>
    </HubMaintenanceGate>
  );
}
