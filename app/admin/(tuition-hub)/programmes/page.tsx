import { redirect } from "next/navigation";
import { getAdminFromCookies } from "@/lib/auth";
import AdminProgrammesManager from "@/components/admin/AdminProgrammesManager";

export default async function AdminProgrammesPage() {
  const session = await getAdminFromCookies();
  if (!session) redirect("/admin/login");
  return <AdminProgrammesManager />;
}
