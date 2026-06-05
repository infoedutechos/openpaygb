/** Server route: resolve org, then render client checkout (no dynamic/ssr:false here). */
export const revalidate = 60;

import Link from "next/link";
import { notFound } from "next/navigation";
import { PayProviders } from "../PayProviders";
import { PayCheckoutClient } from "../PayCheckoutClient";
import { RequestSchoolWorkspaceCta } from "@/components/tuition/RequestSchoolWorkspaceCta";
import { getActiveOrganizationBySlug } from "@/lib/organizations";
import { warnPayOrgMissingActiveOnce } from "@/lib/pay-org-lookup-log";

function PayLoadError({ orgSlug }: { orgSlug: string }) {
  const programmesHref = `/pay/${encodeURIComponent(orgSlug)}?programmes=1`;

  return (
    <div className="mx-auto min-h-[55vh] max-w-lg px-4 pb-28 pt-12 text-center text-slate-300">
      <h1 className="text-xl font-semibold text-white">Tuition checkout is temporarily unavailable</h1>
      <p className="mt-4 text-sm leading-relaxed text-slate-400">
        The app could not load your school workspace from the database. This usually means{" "}
        <code className="rounded bg-black/40 px-1.5 py-0.5 text-xs text-cyan-100/90">DATABASE_URL</code> is missing,
        wrong, or MongoDB is unreachable. Fix the connection and refresh this page.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
        <Link
          href="/"
          className="inline-flex justify-center rounded-xl border border-white/15 bg-white/[0.06] px-5 py-3 text-sm font-semibold text-white hover:border-cyan-400/35"
        >
          Back to lobby
        </Link>
        <Link
          href="/student/login"
          className="inline-flex justify-center rounded-xl bg-gradient-to-r from-cyan-400 to-sky-500 px-5 py-3 text-sm font-semibold text-slate-950 hover:brightness-110"
        >
          Student portal login
        </Link>
        <Link
          href={programmesHref}
          className="inline-flex justify-center rounded-xl border-2 border-cyan-400/60 bg-cyan-500/10 px-5 py-3 text-sm font-semibold text-cyan-50 hover:border-cyan-300 hover:bg-cyan-500/20"
        >
          Programmes
        </Link>
      </div>
      <p className="mt-4 text-xs text-slate-500">
        After the database connects, Programmes opens guest checkout straight to programme selection (no Get Started modal).
      </p>
      <RequestSchoolWorkspaceCta className="mt-8 text-left" />
    </div>
  );
}

function PayOrgUnavailable({ orgSlug }: { orgSlug: string }) {
  return (
    <div className="mx-auto min-h-[55vh] max-w-lg px-4 pb-28 pt-12 text-center text-slate-300">
      <h1 className="text-xl font-semibold text-white">School workspace not available</h1>
      <p className="mt-4 text-sm leading-relaxed text-slate-400">
        There is no <strong className="text-slate-200">active</strong> tuition workspace for slug{" "}
        <code className="rounded bg-black/40 px-1.5 py-0.5 font-mono text-xs text-cyan-100/90">{orgSlug}</code>.{" "}
        It may not exist yet, still be pending approval, or your link may contain a typo.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
        <Link
          href="/"
          className="inline-flex justify-center rounded-xl border border-white/15 bg-white/[0.06] px-5 py-3 text-sm font-semibold text-white hover:border-cyan-400/35"
        >
          Back to lobby
        </Link>
        {orgSlug !== "default" ? (
          <Link
            href="/pay/default"
            className="inline-flex justify-center rounded-xl bg-gradient-to-r from-cyan-400 to-sky-500 px-5 py-3 text-sm font-semibold text-slate-950 hover:brightness-110"
          >
            Open default tuition hub
          </Link>
        ) : (
          <Link
            href="/student/login"
            className="inline-flex justify-center rounded-xl bg-gradient-to-r from-cyan-400 to-sky-500 px-5 py-3 text-sm font-semibold text-slate-950 hover:brightness-110"
          >
            Student portal login
          </Link>
        )}
        <Link
          href="/admin/register"
          className="inline-flex justify-center rounded-xl border-2 border-cyan-400/60 bg-cyan-500/10 px-5 py-3 text-sm font-semibold text-cyan-50 hover:border-cyan-300 hover:bg-cyan-500/20"
        >
          Request school workspace
        </Link>
        <Link
          href="/pay"
          className="inline-flex justify-center rounded-xl border border-white/15 bg-white/[0.06] px-5 py-3 text-sm font-semibold text-white hover:border-cyan-400/35"
        >
          Choose active school
        </Link>
      </div>
      <p className="mt-4 text-xs text-slate-500">
        Guest checkout opens only after a platform master approves the workspace. Pending schools can confirm email from
        the registration page, then sign in at{" "}
        <Link href="/school/login" className="text-cyan-400/90 underline">
          /school/login
        </Link>{" "}
        while awaiting approval.
      </p>
      <RequestSchoolWorkspaceCta className="mt-8 text-left" />
    </div>
  );
}

export default async function PayTenantPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const slug = orgSlug.trim().toLowerCase();
  if (!slug) notFound();

  let org;
  try {
    org = await getActiveOrganizationBySlug(slug);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const code =
      err && typeof err === "object" && "code" in err ? String((err as { code: unknown }).code) : undefined;
    const isAtlasTls =
      message.includes("InternalError") ||
      message.includes("Server selection timeout") ||
      message.includes("ReplicaSetNoPrimary");
    const summary = isAtlasTls
      ? "MongoDB Atlas unreachable (TLS/network/IP allowlist). Fix DATABASE_URL and Atlas Network Access — see .env.example."
      : message.replace(/\s+/g, " ").slice(0, 200);
    console.warn(`[pay] organization lookup slug=${slug} code=${code ?? "n/a"} — ${summary}`);
    return <PayLoadError orgSlug={slug} />;
  }
  if (!org) {
    warnPayOrgMissingActiveOnce(
      slug,
      `[pay] organization lookup slug=${slug} — no active organization (missing, inactive, or pending). Run: npm run db:push && npm run seed`
    );
    return <PayOrgUnavailable orgSlug={slug} />;
  }

  return (
    <PayProviders>
      <PayCheckoutClient organizationSlug={org.slug} organizationName={org.name} />
    </PayProviders>
  );
}
