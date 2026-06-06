import { HubMaintenanceGate } from "@/components/hub/HubMaintenanceGate";
import { StudentPortalShell } from "@/components/student/StudentPortalShell";

export default function StudentSectionLayout({ children }: { children: React.ReactNode }) {
  return (
    <HubMaintenanceGate hub="tuition">
      <StudentPortalShell mode="student">{children}</StudentPortalShell>
    </HubMaintenanceGate>
  );
}
