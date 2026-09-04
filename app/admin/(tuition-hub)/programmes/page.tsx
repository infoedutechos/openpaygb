import { redirect } from "next/navigation";
import { getAdminFromCookies } from "@/lib/auth";
import { SCHOOL_ADMIN_LOGIN_PATH } from "@/lib/admin-auth-entry";
import AdminProgrammesManager from "@/components/admin/AdminProgrammesManager";

export default async function AdminProgrammesPage() {
  const session = await getAdminFromCookies();
  if (!session) redirect(SCHOOL_ADMIN_LOGIN_PATH);
  return <AdminProgrammesManager />;
}
