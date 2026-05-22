import Link from "next/link";
import { HomeHubShell } from "@/components/hub/HomeHubShell";
import { RequestSchoolWorkspaceCta } from "@/components/tuition/RequestSchoolWorkspaceCta";
import { SocialLinksRow } from "@/components/SocialLinksRow";
import { ShareButton } from "@/components/ShareButton";
import { SaveToHomeScreenCard } from "@/components/SaveToHomeScreenCard";
import { HUBS } from "@/lib/ecosystem/hubs";
import { getPublicSiteUiSettings, linksForFooter } from "@/lib/site-ui-settings";

export default async function HomePage() {
  const siteUi = await getPublicSiteUiSettings();
  const communityLinks = linksForFooter(siteUi.socialLinks);

  return (
    <HomeHubShell>
      <div className="space-y-12">
      <section className="relative overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--card)]/80 p-8 shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-sm md:p-12">
        <div
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-cyan-500/20 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-16 -left-16 h-56 w-56 rounded-full bg-sky-600/15 blur-3xl"
          aria-hidden
        />
        <div className="relative grid gap-10 md:grid-cols-[1.15fr_0.85fr] md:items-center">
          <div className="space-y-6">
            <p className="inline-flex items-center gap-2 rounded-full border border-cyan-400/25 bg-cyan-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200">
              Three hubs · One ecosystem
            </p>
            <h1 className="text-3xl font-semibold leading-[1.08] text-white sm:text-4xl md:text-5xl lg:text-[3.25rem]">
              <span className="text-cyan-100">Tuition Hub</span> for fees and{" "}
              <span className="bg-gradient-to-r from-cyan-200 to-sky-400 bg-clip-text text-transparent">TON</span>;{" "}
              <span className="text-violet-200">Dex Hub</span> for{" "}
              <span className="text-fuchsia-200">onramp · offramp</span>;{" "}
              <span className="text-sky-100">Play Hub</span> for engagement.
            </h1>
            <p className="max-w-xl text-lg leading-relaxed text-slate-400">
              Tuition Hub keeps multi-tenant programmes, OpenPayGlobal / Mbiyo rails where configured, receipts, and admin
              tooling. Dex Hub is the dedicated liquidity layer—extend <code className="rounded bg-black/35 px-1 text-sm">lib/ecosystem/hubs.ts</code> to plug new rails without rewiring the other hubs. Play Hub remains the GamiFi surface.
            </p>
            <div className="flex flex-wrap gap-3 pt-1">
              <Link
                href="/pay"
                className="rounded-xl bg-gradient-to-r from-cyan-400 to-sky-500 px-6 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-500/20 hover:brightness-110 transition-[filter]"
              >
                Pay tuition — choose school
              </Link>
              <Link
                href="/?hub=dex"
                className="rounded-xl border border-violet-400/35 bg-violet-500/15 px-6 py-3 text-sm font-semibold text-violet-50 hover:border-violet-300/50 hover:bg-violet-500/25 transition-colors"
              >
                Open Dex Hub
              </Link>
              <Link
                href="/?hub=play"
                className="rounded-xl border border-white/15 bg-white/[0.06] px-6 py-3 text-sm font-semibold text-slate-100 hover:border-cyan-400/35 hover:bg-white/[0.09] transition-colors"
              >
                Open Play Hub
              </Link>
              <Link
                href="/school/login"
                className="rounded-xl border border-cyan-400/35 bg-cyan-500/10 px-6 py-3 text-sm font-semibold text-cyan-100 hover:border-cyan-300/50 hover:bg-cyan-500/20 transition-colors"
              >
                School admin sign in
              </Link>
              <Link
                href="/admin/login?master=1"
                className="rounded-xl px-6 py-3 text-sm font-semibold text-slate-400 hover:text-white transition-colors"
              >
                Platform master →
              </Link>
            </div>
            <RequestSchoolWorkspaceCta className="max-w-xl" />
            {(communityLinks.length > 0 || siteUi.shareEnabled) && (
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <SocialLinksRow links={communityLinks} />
                <ShareButton variant="primary" label="Share ODEL HUB" />
              </div>
            )}
          </div>
          <div className="relative space-y-4">
            <SaveToHomeScreenCard />
            <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-6 backdrop-blur-md">
            <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Tuition Hub · At a glance</h2>
            <ul className="space-y-4 text-sm leading-relaxed text-slate-200">
              <li className="flex gap-3">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-400" aria-hidden />
                Telegram bot path: menu → programme → term → TON instructions.
              </li>
              <li className="flex gap-3">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-sky-400" aria-hidden />
                Web + TON Connect: wallet, on-chain comment, status polling.
              </li>
              <li className="flex gap-3">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-300/80" aria-hidden />
                MoMo webhooks → ledger, Telegram notify, UGX→TON bridge hook (
                <code className="rounded-md bg-black/35 px-1.5 py-0.5 text-xs text-cyan-100/90">/api/webhooks/momo</code>
                ).
              </li>
              <li className="flex gap-3">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" aria-hidden />
                <span>
                  <strong className="font-semibold text-slate-100">Multi-tenant.</strong> Each{" "}
                  <span className="text-cyan-100/90">organization</span> is a workspace with its own programmes, fee
                  lines, FX snapshots, students, payments, and TON destination wallet. Public pay can be scoped with an
                  org slug; org admins see one tenant, platform masters can manage many.
                </span>
              </li>
            </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-cyan-500/25 bg-cyan-950/20 p-6 shadow-lg shadow-black/20">
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-300/90">Tuition Hub</h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-300">
            Programme fees in UGX, settlement on TON, smart receipts, and operator tools—built for ODEL HUB tuition
            operations. Data is modeled <span className="text-cyan-100/95">per organization</span> so many schools can
            share one deployment with clear isolation and tenant lifecycle (active, pending, rejected).
          </p>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Link
              href="/pay"
              className="inline-flex justify-center rounded-xl bg-gradient-to-r from-cyan-400 to-sky-500 px-5 py-2.5 text-sm font-semibold text-slate-950 hover:brightness-110 transition-[filter]"
            >
              Go to Tuition Hub
            </Link>
            <Link
              href="/admin/register"
              className="inline-flex flex-col items-center justify-center rounded-xl border border-cyan-400/45 bg-cyan-500/10 px-5 py-2.5 text-sm font-semibold text-cyan-50 hover:border-cyan-300/55 hover:bg-cyan-500/20"
            >
              <span>Request school workspace</span>
              <span className="mt-0.5 text-[10px] font-normal text-cyan-200/75">Self-register on our platform</span>
            </Link>
          </div>
        </div>
        <div className="rounded-2xl border border-sky-500/20 bg-slate-950/50 p-6 shadow-lg shadow-black/20">
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-sky-300/90">Play Hub</h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-300">
            GamiFi Platform home, learn, services, earn, and guild—pearls, tasks, and engagement. Use the bottom bar on
            this page or open the full mini-app.
          </p>
          <Link
            href="/?hub=play"
            className="mt-5 inline-flex rounded-xl border border-white/20 bg-white/[0.08] px-5 py-2.5 text-sm font-semibold text-white hover:border-cyan-400/40 hover:bg-white/[0.12] transition-colors"
          >
            Play Hub on this page
          </Link>
          <Link
            href="/clicker"
            className="mt-3 inline-flex text-sm font-medium text-sky-200/90 underline-offset-2 hover:text-white hover:underline"
          >
            Open full Play Hub app →
          </Link>
          {HUBS.play.upstream ? (
            <p className="mt-4 border-t border-white/10 pt-4 text-xs leading-relaxed text-slate-500">
              Play shell syncs from{" "}
              <a
                href={HUBS.play.upstream.github}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-sky-400/90 hover:text-sky-300"
              >
                ura-pearl-data-center
              </a>
              {HUBS.play.upstream.live ? (
                <>
                  {" "}
                  ·{" "}
                  <a
                    href={HUBS.play.upstream.live}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-sky-400/90 hover:text-sky-300"
                  >
                    live reference
                  </a>
                </>
              ) : null}
              . Dev merge: <code className="rounded bg-black/30 px-1 py-0.5 text-[10px] text-slate-400">{HUBS.play.upstream.syncCommand}</code>
            </p>
          ) : null}
        </div>
        <div className="rounded-2xl border border-violet-500/30 bg-violet-950/25 p-6 shadow-lg shadow-black/20 md:col-span-1">
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-violet-300/95">Dex Hub</h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-300">
            Onramp and offramp between mobile money, OpenPayGlobal rails, and TON. Register additional venues in the hub
            manifest and wire APIs without touching Tuition or Play shells.
          </p>
          <Link
            href="/dex"
            className="mt-5 inline-flex rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg hover:brightness-110 transition-[filter]"
          >
            Open Dex Hub
          </Link>
          <Link
            href="/dex/onramp"
            className="mt-3 block text-sm font-medium text-violet-200/90 underline-offset-2 hover:text-white hover:underline"
          >
            Onramp overview →
          </Link>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {[
          {
            title: "Multi-tenant (Tuition Hub)",
            body: "Organizations are tenants: isolated programmes, students, payments, and FX. Masters provision and approve workspaces; org admins stay within their school.",
          },
          {
            title: "Multi-rail payments",
            body: "TON, web, Telegram, and MoMo in one payment surface, with webhooks and receipts wired to the same tenant-scoped ledger.",
          },
          {
            title: "Auditable",
            body: "Receipts and admin actions aligned for compliance-friendly review inside each tenant boundary.",
          },
        ].map((card) => (
          <div
            key={card.title}
            className="rounded-2xl border border-[var(--border)] bg-[var(--card-solid)]/60 p-5 shadow-lg shadow-black/20"
          >
            <h3 className="text-sm font-semibold text-white">{card.title}</h3>
            <p className="mt-2 text-sm text-slate-400 leading-relaxed">{card.body}</p>
          </div>
        ))}
      </section>
      </div>
    </HomeHubShell>
  );
}
