import { HubMaintenanceGate } from "@/components/hub/HubMaintenanceGate";
import DexHubShell from "@/app/dex/DexHubShell";

export default function OpgbLayout({ children }: { children: React.ReactNode }) {
  return (
    <HubMaintenanceGate hub="dex">
      <DexHubShell>{children}</DexHubShell>
    </HubMaintenanceGate>
  );
}
