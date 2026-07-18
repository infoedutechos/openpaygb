import Link from "next/link";
import { LoginChooserCards } from "@/components/login/LoginChooserCards";
import { PLATFORM_MASTER_LOGIN_PATH } from "@/lib/admin-auth-entry";

export default function LoginChooserPage() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-2xl flex-col justify-center px-4 py-12">
      <LoginChooserCards />
      <p className="mt-8 text-center text-xs text-slate-500">
        Platform operators:{" "}
        <Link href={PLATFORM_MASTER_LOGIN_PATH} className="text-amber-300/90 hover:underline">
          Master console sign in
        </Link>
      </p>
      <p className="mt-3 text-center text-xs text-slate-500">
        New school or institution?{" "}
        <Link href="/admin/register" className="text-cyan-300 hover:underline">
          Register a workspace
        </Link>
      </p>
    </div>
  );
}
