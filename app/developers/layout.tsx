import { HubMaintenanceGate } from "@/components/hub/HubMaintenanceGate";
import { DevelopersShell } from "@/components/developers/DevelopersShell";

export default function DevelopersLayout({ children }: { children: React.ReactNode }) {
  return (
    <HubMaintenanceGate hub="developers">
      <DevelopersShell>{children}</DevelopersShell>
    </HubMaintenanceGate>
  );
}
