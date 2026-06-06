import { HubMaintenanceGate } from "@/components/hub/HubMaintenanceGate";

export default function SchoolLayout({ children }: { children: React.ReactNode }) {
  return <HubMaintenanceGate hub="tuition">{children}</HubMaintenanceGate>;
}
