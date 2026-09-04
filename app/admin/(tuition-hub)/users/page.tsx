import { redirect } from "next/navigation";
import { AdminUsersInvitePanel } from "@/components/admin/AdminUsersInvitePanel";
import { TuitionHubCheckoutExplainerCompact } from "@/components/admin/TuitionHubCheckoutExplainer";
import { ServerDbUnavailable } from "@/components/ui/ServerDbUnavailable";
import { prisma } from "@/lib/prisma";
import { getAdminFromCookies } from "@/lib/auth";
import { SCHOOL_ADMIN_LOGIN_PATH } from "@/lib/admin-auth-entry";
import { organizationWhereForSession } from "@/lib/admin-org-scope";
import { tryServerDb } from "@/lib/run-server-db";

export default async function AdminUsersPage() {
  const session = await getAdminFromCookies();
  if (!session) redirect(SCHOOL_ADMIN_LOGIN_PATH);
  const usersResult = await tryServerDb(async () => {
    const orgWhere = await organizationWhereForSession(session.sub, session.role);
    return prisma.adminUser.findMany({
      where: "organizationId" in orgWhere ? { organizationId: orgWhere.organizationId } : undefined,
      orderBy: { createdAt: "desc" },
      take: 80,
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    });
  });
  if (!usersResult.ok) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold text-white">Users</h1>
        <ServerDbUnavailable />
      </div>
    );
  }
  const users = usersResult.data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Users</h1>
        <p className="text-sm text-slate-400">
          {session.role === "master"
            ? "Dashboard accounts across organizations (latest 80)."
            : "Organization administrators."}{" "}
          Tuition checkout fees and programme fee schedules are configured elsewhere (Manager → Organizations and Programs);
          this list is only sign-ins for the hub.
        </p>
        <TuitionHubCheckoutExplainerCompact className="mt-2 max-w-3xl" />
      </div>

      {session.role === "org_admin" ? <AdminUsersInvitePanel /> : null}

      <div className="space-y-3 md:hidden">
        {users.length === 0 ? (
          <p className="text-sm text-slate-500">No admin users yet.</p>
        ) : (
          users.map((u) => (
            <article
              key={u.id}
              className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 text-sm text-slate-200"
            >
              <p className="font-mono text-xs text-sky-300 break-all">{u.email}</p>
              <p className="mt-2 font-medium text-white">{u.name || "—"}</p>
              <p className="mt-1 text-xs capitalize text-slate-400">{u.role}</p>
              <p className="mt-2 text-xs text-slate-500">Added {u.createdAt.toLocaleDateString()}</p>
            </article>
          ))
        )}
      </div>

      <div className="hidden overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--card)] md:block">
        <table className="min-w-full text-left text-sm text-slate-200">
          <thead className="border-b border-[var(--border)] text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Role</th>
              <th className="px-3 py-2">Added</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-[var(--border)]/60">
                <td className="px-3 py-2 font-mono text-xs text-sky-300">{u.email}</td>
                <td className="px-3 py-2">{u.name || "—"}</td>
                <td className="px-3 py-2 text-slate-400">{u.role}</td>
                <td className="px-3 py-2 text-slate-500">{u.createdAt.toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
