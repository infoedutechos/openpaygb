import { HubMaintenanceGate } from "@/components/hub/HubMaintenanceGate";

export default function DevelopersLayout({ children }: { children: React.ReactNode }) {
  return <HubMaintenanceGate hub="developers">{children}</HubMaintenanceGate>;
}
