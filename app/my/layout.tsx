import { StudentPortalShell } from "@/components/student/StudentPortalShell";

export default function MyStudentLayout({ children }: { children: React.ReactNode }) {
  return <StudentPortalShell mode="my">{children}</StudentPortalShell>;
}
