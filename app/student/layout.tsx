import { StudentPortalShell } from "@/components/student/StudentPortalShell";

export default function StudentSectionLayout({ children }: { children: React.ReactNode }) {
  return <StudentPortalShell mode="student">{children}</StudentPortalShell>;
}
