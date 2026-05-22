import { redirect } from "next/navigation";
import { SCHOOL_ADMIN_LOGIN_PATH } from "@/lib/admin-auth-entry";

/** Friendly URL for school staff — same form as `/admin/login?school=1`. */
export default function SchoolLoginPage() {
  redirect(SCHOOL_ADMIN_LOGIN_PATH);
}
