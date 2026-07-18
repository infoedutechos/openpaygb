import Link from "next/link";
import { LoginChooserCards } from "@/components/login/LoginChooserCards";
import { OperatorAllSidesNav } from "@/components/nav/OperatorAllSidesNav";
import { PLATFORM_MASTER_LOGIN_PATH } from "@/lib/admin-auth-entry";

export default function LoginChooserPage() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-3xl flex-col justify-center gap-10 px-4 py-12">
      <section aria-labelledby="user-login-heading">
        <p id="user-login-heading" className="mb-3 text-center text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          User-facing sign-in
        </p>
        <LoginChooserCards />
      </section>

      <section aria-labelledby="builder-login-heading" className="space-y-4">
        <div className="text-center">
          <p id="builder-login-heading" className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400/90">
            Developer-facing
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Builders own the Partner API portal and can open every user side below (each side still needs its own login).
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-3 text-sm">
          <Link
            href="/developers"
            className="rounded-xl border border-emerald-500/35 bg-emerald-950/30 px-4 py-2.5 font-semibold text-emerald-100 hover:bg-emerald-500/15"
          >
            Developer hub
          </Link>
          <Link
            href="/developers/register"
            className="rounded-xl border border-white/15 px-4 py-2.5 text-slate-300 hover:bg-white/5"
          >
            Register integrator app
          </Link>
          <Link
            href={PLATFORM_MASTER_LOGIN_PATH}
            className="rounded-xl border border-amber-500/35 bg-amber-950/25 px-4 py-2.5 font-semibold text-amber-100 hover:bg-amber-500/10"
          >
            Master console
          </Link>
        </div>
        <OperatorAllSidesNav
          title="Developers face all sides"
          subtitle="Shortcuts into every product surface. User portals remain role-locked."
          compact
        />
      </section>

      <p className="text-center text-xs text-slate-500">
        New school or institution?{" "}
        <Link href="/admin/register" className="text-cyan-300 hover:underline">
          Register a workspace
        </Link>
      </p>
    </div>
  );
}
