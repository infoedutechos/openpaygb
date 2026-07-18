import { StaffPortalShell } from "@/components/staff/StaffPortalShell";

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  return <StaffPortalShell>{children}</StaffPortalShell>;
}
