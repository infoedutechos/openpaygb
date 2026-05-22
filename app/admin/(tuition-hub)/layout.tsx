import TuitionAdminShell from "@/components/admin/TuitionAdminShell";

export default function TuitionHubAdminLayout({ children }: { children: React.ReactNode }) {
  return <TuitionAdminShell>{children}</TuitionAdminShell>;
}
