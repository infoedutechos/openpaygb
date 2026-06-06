import { HubMaintenanceGate } from "@/components/hub/HubMaintenanceGate";
import ClickerLayoutClient from "./ClickerLayoutClient";

export default function ClickerLayout({ children }: { children: React.ReactNode }) {
  return (
    <HubMaintenanceGate hub="play">
      <ClickerLayoutClient>{children}</ClickerLayoutClient>
    </HubMaintenanceGate>
  );
}
