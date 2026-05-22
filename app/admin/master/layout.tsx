import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAdminFromCookies } from "@/lib/auth";
import MasterManagerShell from "@/components/admin/MasterManagerShell";

export const dynamic = "force-dynamic";

export default async function MasterConsoleLayout({ children }: { children: React.ReactNode }) {
  const session = await getAdminFromCookies();
  if (!session) {
    redirect("/admin/login?next=%2Fadmin%2Fmaster");
  }
  const user = await prisma.adminUser.findUnique({
    where: { id: session.sub },
    select: { role: true },
  });
  if (!user || user.role !== "master") {
    redirect("/admin");
  }
  return <MasterManagerShell>{children}</MasterManagerShell>;
}
