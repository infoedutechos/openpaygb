"use client";

import Link from "next/link";
import { choiceCompactNav, choiceCompactNavAmber } from "@/components/choice-cards";
import { SocialLinksRow } from "@/components/SocialLinksRow";
import { ShareButton } from "@/components/ShareButton";
import { linksForFooter, type PublicSiteUiSettings } from "@/lib/site-ui-shared";

const DEFAULT_BLURB =
  "TON Pay connects fee schedules in UGX with on-chain settlement, receipts, and admin tools for schools on the tuition waiver programme.";

type Props = {
  settings: PublicSiteUiSettings;
  /** Extra padding when the global bottom nav is visible (marketing pages). */
  bottomNavClearance?: boolean;
};

export function SiteFooter({ settings, bottomNavClearance }: Props) {
  const blurb = settings.footerIntro.trim() || DEFAULT_BLURB;
  const footerLinks = linksForFooter(settings.socialLinks);

  return (
    <footer
      className={`mt-auto border-t border-ura-border/80 bg-ura-navy/70 backdrop-blur-xl print:pb-10 ${
        bottomNavClearance ? "pb-36 md:pb-32" : "pb-28 md:pb-32"
      }`}
    >
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div className="max-w-md space-y-4">
            <p className="text-base font-semibold tracking-tight text-white">ODEL HUB</p>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-400">{blurb}</p>
            {footerLinks.length > 0 ? (
              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Community</p>
                <SocialLinksRow links={footerLinks} size="sm" />
              </div>
            ) : null}
            {settings.shareEnabled ? (
              <ShareButton variant="compact" label="Share ODEL HUB" />
            ) : null}
          </div>
          {settings.footerShowQuickLinks ? (
            <nav className="flex flex-wrap items-center gap-2 sm:gap-3" aria-label="Footer">
              <Link href="/" className={choiceCompactNav}>
                Home
              </Link>
              <Link href="/pay" className={choiceCompactNav}>
                Pay tuition
              </Link>
              <Link href="/student/login" className={choiceCompactNav}>
                Student sign in
              </Link>
              <Link href="/admin/register" className={choiceCompactNav} title="Self-register on our platform">
                Request school workspace
              </Link>
              <Link href="/school/login" className={choiceCompactNav}>
                School admin
              </Link>
              <Link href="/admin/login?master=1" className={choiceCompactNavAmber}>
                Master console
              </Link>
            </nav>
          ) : null}
        </div>
        {settings.footerCopyrightVisible ? (
          <div className="mt-8 border-t border-[var(--border)] pt-6 text-xs text-slate-500">
            <p>
              © {new Date().getFullYear()} ODEL HUB · Tuition waiver programme ·{" "}
              <span className="text-slate-600">Health: </span>
              <Link href="/api/health" className={`${choiceCompactNav} text-xs text-slate-400`}>
                API health
              </Link>
            </p>
          </div>
        ) : null}
      </div>
    </footer>
  );
}
