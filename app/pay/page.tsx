import Link from "next/link";
import { RequestSchoolWorkspaceCta } from "@/components/tuition/RequestSchoolWorkspaceCta";
import { SchoolCodeQuickPay } from "@/components/pay/SchoolCodeQuickPay";
import { listActiveOrganizations } from "@/lib/organizations";

export const revalidate = 60;

/** Tuition pay entry: pick an active school (tenant) before checkout. */
export default async function PayIndexPage() {
  const organizations = await listActiveOrganizations();

  return (
    <div className="mx-auto min-h-[60vh] max-w-xl px-4 pb-20 pt-10">
      <header className="space-y-2 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300/90">Tuition pay</p>
        <h1 className="text-2xl font-semibold text-white sm:text-3xl">Choose your school</h1>
        <p className="text-sm text-slate-400">
          Each school has its own programmes, fee schedules, and checkout. Select the tenant that matches your
          institution.
        </p>
      </header>

      <div className="mt-6">
        <SchoolCodeQuickPay />
      </div>

      {organizations.length === 0 ? (
        <p className="mt-8 rounded-xl border border-amber-500/30 bg-amber-950/25 px-4 py-3 text-center text-sm text-amber-100">
          No active schools yet. Run <code className="font-mono">npm run db:push</code> and{" "}
          <code className="font-mono">npm run seed</code>, then refresh.
        </p>
      ) : (
        <ul className="mt-8 grid gap-3 sm:grid-cols-2">
          {organizations.map((o) => (
            <li key={o.slug}>
              <Link
                href={`/pay/${encodeURIComponent(o.slug)}`}
                className="block rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-4 text-left transition hover:border-cyan-400/40 hover:bg-[var(--card)]/90"
              >
                <p className="text-sm font-semibold text-white">{o.name}</p>
                <p className="mt-1 font-mono text-xs text-slate-400">{o.slug}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <RequestSchoolWorkspaceCta className="mt-8" />

      <p className="mt-8 text-center text-xs text-slate-500">
        Student portal?{" "}
        <Link href="/student/login" className="text-cyan-300 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
