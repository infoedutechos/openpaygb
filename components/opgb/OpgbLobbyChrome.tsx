import { HubMaintenanceGate } from "@/components/hub/HubMaintenanceGate";
import DexHubShell from "@/app/dex/DexHubShell";

/** OpenPayGB lobby chrome — does not wrap hosted checkout. */
export async function OpgbLobbyChrome({ children }: { children: React.ReactNode }) {
  return (
    <HubMaintenanceGate hub="dex" allowWhenHidden>
      <DexHubShell>{children}</DexHubShell>
    </HubMaintenanceGate>
  );
}
