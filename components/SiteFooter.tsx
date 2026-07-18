"use client";

import Link from "next/link";
import { CommunityLiveFeed } from "@/components/footer/CommunityLiveFeed";
import { ShareButton } from "@/components/ShareButton";
import { SocialLinksRow } from "@/components/SocialLinksRow";
import { SITE_FOOTER_COLUMNS } from "@/lib/ecosystem/site-nav-menus";
import { linksForFooter, type PublicSiteUiSettings } from "@/lib/site-ui-shared";

const DEFAULT_BLURB =
  "ODEL HUB connects programme fees in UGX with TON and mobile-money settlement — OdelPay for institutions and schools, OpenPayGB for global wallet and Dex flows.";

type Props = {
  settings: PublicSiteUiSettings;
  /** Extra padding when the global bottom nav is visible (marketing pages). */
  bottomNavClearance?: boolean;
};

function FooterColumn({ heading, links }: { heading: string; links: { label: string; href: string }[] }) {
  return (
    <div className="min-w-0">
      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">{heading}</h3>
      <ul className="mt-3 space-y-2">
        {links.map((link) => (
          <li key={`${heading}-${link.href}-${link.label}`}>
            <Link
              href={link.href}
              className="text-sm text-slate-400 transition-colors hover:text-cyan-200/90"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SiteFooter({ settings, bottomNavClearance }: Props) {
  const blurb = settings.footerIntro.trim() || DEFAULT_BLURB;
  const footerLinks = linksForFooter(settings.socialLinks);
  const showCommunity = footerLinks.length > 0 || settings.shareEnabled;
  const brand = settings.platformDisplayName?.trim() || settings.shareDefaultTitle?.trim() || "ODEL HUB";

  return (
    <footer
      className={`mt-auto border-t border-ura-border/80 bg-ura-navy/70 backdrop-blur-xl print:pb-10 ${
        bottomNavClearance ? "pb-36 md:pb-32" : "pb-28 md:pb-32"
      }`}
    >
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 xl:gap-6">
          <div className="space-y-4 md:col-span-2 xl:col-span-2">
            <p className="text-lg font-semibold tracking-tight text-white">{brand}</p>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-400">{blurb}</p>

            {showCommunity ? (
              <div className="rounded-xl border border-cyan-400/30 bg-gradient-to-br from-cyan-500/10 to-violet-500/5 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">
                  Be part of our community
                </p>
                {footerLinks.length > 0 ? (
                  <SocialLinksRow
                    links={footerLinks}
                    variant="community"
                    className="mt-4"
                  />
                ) : (
                  <p className="mt-3 text-xs text-slate-400">
                    Community links are configured in Master Admin → Site UI.
                  </p>
                )}
                <CommunityLiveFeed className="mt-4" />
                {settings.shareEnabled ? (
                  <div className="mt-4">
                    <ShareButton variant="primary" label={`Share ${brand}`} />
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          {settings.footerShowQuickLinks
            ? SITE_FOOTER_COLUMNS.map((col) => <FooterColumn key={col.heading} heading={col.heading} links={col.links} />)
            : null}
        </div>

        {settings.footerCopyrightVisible ? (
          <div className="mt-10 border-t border-[var(--border)] pt-6 text-xs text-slate-500">
            <p>
              © {new Date().getFullYear()} ODEL HUB · Tuition waiver programme ·{" "}
              <Link href="/" className="text-slate-400 hover:text-cyan-300 hover:underline">
                Home
              </Link>
            </p>
          </div>
        ) : null}
      </div>
    </footer>
  );
}
