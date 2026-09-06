import Link from "next/link";
import { HomeHubShell } from "@/components/hub/HomeHubShell";
import { RequestSchoolWorkspaceCta } from "@/components/tuition/RequestSchoolWorkspaceCta";
import { SocialLinksRow } from "@/components/SocialLinksRow";
import { ShareButton } from "@/components/ShareButton";
import { ProductBrandMark } from "@/components/ecosystem/ProductBrandMark";
import { ProductLinesSection } from "@/components/ecosystem/ProductLinesSection";
import { getPublicSiteUiSettings, linksForFooter } from "@/lib/site-ui-settings";
import { getHubVisibilityState } from "@/lib/hub-visibility";
import { getProductLogoPublicUrls } from "@/lib/product-logos";
import { PLATFORM_BRAND_NAME } from "@/lib/platform-brand";

export default async function HomePage() {
  const [siteUi, hubHidden, productLogos] = await Promise.all([
    getPublicSiteUiSettings(),
    getHubVisibilityState(),
    getProductLogoPublicUrls(),
  ]);
  const communityLinks = linksForFooter(siteUi.socialLinks);
  const brand = siteUi.platformDisplayName?.trim() || PLATFORM_BRAND_NAME;

  return (
    <HomeHubShell>
      <div className="space-y-16">
        <section className="relative overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--card)]/80 p-8 shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-sm md:p-14">
          <div
            className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-cyan-500/20 blur-3xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -bottom-16 -left-16 h-56 w-56 rounded-full bg-sky-600/15 blur-3xl"
            aria-hidden
          />
          <div className="relative mx-auto max-w-3xl space-y-8 text-center md:text-left">
            <div className="flex flex-col items-center gap-4 md:items-start">
              {productLogos.hub ? (
                <ProductBrandMark
                  product="hub"
                  url={productLogos.hub}
                  label={brand}
                  size={56}
                  className="h-14 w-14 rounded-2xl"
                />
              ) : (
                <span
                  className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400/90 to-sky-600 text-lg font-black text-slate-950"
                  aria-hidden
                >
                  OP
                </span>
              )}
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-200/90">{brand}</p>
            </div>
            <h1 className="text-4xl font-semibold leading-[1.05] tracking-tight text-white sm:text-5xl md:text-[3.35rem]">
              {siteUi.homeHeroHeadline?.trim() ? (
                siteUi.homeHeroHeadline.trim()
              ) : (
                <>
                  Tuition, wallets, and Dex —{" "}
                  <span className="bg-gradient-to-r from-cyan-100 to-sky-200 bg-clip-text text-transparent">
                    one platform
                  </span>
                </>
              )}
            </h1>
            <p className="max-w-xl text-lg leading-relaxed text-slate-400 md:mx-0 mx-auto">
              {siteUi.homeHeroSubhead?.trim() ||
                "OdelPay for schools and higher institutions. OpenPayGB for cards, MoMo, TON, and Dex."}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-1 md:justify-start">
              {!hubHidden.tuition ? (
                <Link
                  href="/pay"
                  className="rounded-xl bg-gradient-to-r from-cyan-400 to-sky-500 px-7 py-3.5 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-500/20 transition-[filter] hover:brightness-110"
                >
                  Pay tuition
                </Link>
              ) : null}
              <Link
                href="/login"
                className="rounded-xl border border-white/20 bg-white/[0.06] px-7 py-3.5 text-sm font-semibold text-white transition-colors hover:border-cyan-400/40 hover:bg-white/[0.1]"
              >
                Log in
              </Link>
            </div>
            {!hubHidden.tuition ? <RequestSchoolWorkspaceCta className="mx-auto max-w-xl md:mx-0" /> : null}
            {(communityLinks.length > 0 || siteUi.shareEnabled) && (
              <div className="flex flex-wrap items-center justify-center gap-3 border-t border-white/10 pt-6 md:justify-start">
                <SocialLinksRow links={communityLinks} />
                {siteUi.shareEnabled ? (
                  <ShareButton variant="primary" label={`Share ${brand}`} />
                ) : null}
              </div>
            )}
          </div>
        </section>

        <ProductLinesSection hubHidden={hubHidden} productLogos={productLogos} />

        <section className="grid gap-6 sm:grid-cols-3">
          {[
            {
              title: "Multi-tenant tuition",
              body: "Each school or institution is a workspace with its own programmes, students, payments, and settlement.",
            },
            {
              title: "Multi-rail payments",
              body: "TON, mobile money, and OpenPayGB card rails in one ledger — web, Telegram, and checkout.",
            },
            {
              title: "Built for operators",
              body: "School admin, student, staff, developers, and master console — each with its own sign-in.",
            },
          ].map((card) => (
            <div key={card.title} className="border-t border-white/10 pt-4">
              <h3 className="text-sm font-semibold text-white">{card.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">{card.body}</p>
            </div>
          ))}
        </section>
      </div>
    </HomeHubShell>
  );
}
