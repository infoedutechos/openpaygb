import Link from "next/link";
import { HomeHubShell } from "@/components/hub/HomeHubShell";
import { RequestSchoolWorkspaceCta } from "@/components/tuition/RequestSchoolWorkspaceCta";
import { SocialLinksRow } from "@/components/SocialLinksRow";
import { ShareButton } from "@/components/ShareButton";
import { SaveToHomeScreenCard } from "@/components/SaveToHomeScreenCard";
import { ProductLinesSection } from "@/components/ecosystem/ProductLinesSection";
import { SiteVisitorStats } from "@/components/hub/SiteVisitorStats";
import { getPublicSiteUiSettings, linksForFooter } from "@/lib/site-ui-settings";
import { getHubVisibilityState } from "@/lib/hub-visibility";

export default async function HomePage() {
  const [siteUi, hubHidden] = await Promise.all([getPublicSiteUiSettings(), getHubVisibilityState()]);
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
              {siteUi.platformDisplayName?.trim() || "ODEL HUB"} · OdelPay · OpenPayGB · AssessmentVerse OS
            </p>
            <h1 className="text-3xl font-semibold leading-[1.08] text-white sm:text-4xl md:text-5xl lg:text-[3.25rem]">
              {siteUi.homeHeroHeadline?.trim() ? (
                siteUi.homeHeroHeadline.trim()
              ) : (
                <>
                  <span className="text-cyan-100">OdelPay</span> for higher institutions and schools;{" "}
                  <span className="bg-gradient-to-r from-violet-200 to-fuchsia-300 bg-clip-text text-transparent">
                    OpenPayGB
                  </span>{" "}
                  for global wallet, card, and Dex.
                </>
              )}
            </h1>
            <p className="max-w-xl text-lg leading-relaxed text-slate-400">
              {siteUi.homeHeroSubhead?.trim() ||
                "Three product lines with separate entry points: tuition and admin for universities, school workspace registration for primary and secondary, and OpenPayGB for OPGB wallet, MoMo, TON, and Dex liquidity."}
            </p>
            <div className="flex flex-wrap gap-3 pt-1">
              {!hubHidden.tuition ? (
                <Link
                  href="/pay"
                  className="rounded-xl bg-gradient-to-r from-cyan-400 to-sky-500 px-6 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-500/20 hover:brightness-110 transition-[filter]"
                >
                  Pay tuition — choose school
                </Link>
              ) : null}
              {!hubHidden.dex ? (
                <Link
                  href="/?hub=dex"
                  className="rounded-xl border border-violet-400/35 bg-violet-500/15 px-6 py-3 text-sm font-semibold text-violet-50 hover:border-violet-300/50 hover:bg-violet-500/25 transition-colors"
                >
                  Open Dex Hub
                </Link>
              ) : null}
              {!hubHidden.play ? (
                <Link
                  href="/play"
                  className="rounded-xl border border-white/15 bg-white/[0.06] px-6 py-3 text-sm font-semibold text-slate-100 hover:border-cyan-400/35 hover:bg-white/[0.09] transition-colors"
                >
                  Open Play Hub
                </Link>
              ) : null}
              <Link
                href="/login"
                className="rounded-xl border border-cyan-400/35 bg-cyan-500/10 px-6 py-3 text-sm font-semibold text-cyan-100 hover:border-cyan-300/50 hover:bg-cyan-500/20 transition-colors"
              >
                Log in
              </Link>
              <Link
                href="/admin/login?master=1"
                className="rounded-xl px-6 py-3 text-sm font-semibold text-slate-400 hover:text-white transition-colors"
              >
                Platform master →
              </Link>
            </div>
            {!hubHidden.tuition ? <RequestSchoolWorkspaceCta className="max-w-xl" /> : null}
            {(communityLinks.length > 0 || siteUi.shareEnabled) && (
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <SocialLinksRow links={communityLinks} />
                <ShareButton variant="primary" label={`Share ${siteUi.platformDisplayName?.trim() || "ODEL HUB"}`} />
              </div>
            )}
          </div>
          <div className="relative space-y-4">
            <SaveToHomeScreenCard />
            {!hubHidden.tuition ? (
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
            ) : null}
          </div>
        </div>
      </section>

      <SiteVisitorStats />

      <ProductLinesSection hubHidden={hubHidden} />

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
