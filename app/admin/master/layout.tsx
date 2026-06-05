import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAdminFromCookies } from "@/lib/auth";
import MasterManagerShell from "@/components/admin/MasterManagerShell";
import { isTransientMongoError, withPrismaRetry } from "@/lib/prisma-retry";

export const dynamic = "force-dynamic";

export default async function MasterConsoleLayout({ children }: { children: React.ReactNode }) {
  const session = await getAdminFromCookies();
  if (!session) {
    redirect("/admin/login?next=%2Fadmin%2Fmaster");
  }

  if (session.role !== "master") {
    redirect("/admin");
  }

  try {
    const user = await withPrismaRetry(() =>
      prisma.adminUser.findUnique({
        where: { id: session.sub },
        select: { role: true },
      }),
    );
    if (!user || user.role !== "master") {
      redirect("/admin");
    }
  } catch (e) {
    if (!isTransientMongoError(e)) throw e;
    return (
      <MasterManagerShell dbUnavailable>
        {children}
      </MasterManagerShell>
    );
  }

  return <MasterManagerShell>{children}</MasterManagerShell>;
}
