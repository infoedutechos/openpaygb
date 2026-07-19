"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { DashboardMobileChrome } from "@/components/nav/DashboardMobileChrome";
import { AUDIENCE_GUIDES, HELP_CENTER_HREF } from "@/lib/audience-guides";

type Props = {
  title?: string;
  subtitle?: string;
};

const TUITION_DESTINATIONS = [
  { href: "/OdelPayUniversities", label: "Universities lobby" },
  { href: "/OdelPaySchools", label: "Schools lobby" },
  { href: "/pay", label: "Pay tuition / fees" },
  { href: "/pay/riverside-demo", label: "Demo school checkout" },
  { href: "/receipt", label: "Receipts" },
  { href: "/admin/register?segment=schools", label: "Register school" },
  { href: "/admin/register?segment=higher", label: "Register higher institution" },
  { href: "/school/login", label: "School / institution admin" },
  { href: "/student/login", label: "Student sign in" },
  { href: "/login", label: "Log in chooser" },
  { href: "/dex", label: "Dex Hub" },
  { href: "/clicker", label: "Play Hub" },
  { href: AUDIENCE_GUIDES.student_schools.helpHref, label: AUDIENCE_GUIDES.student_schools.label },
  { href: AUDIENCE_GUIDES.student_higher.helpHref, label: AUDIENCE_GUIDES.student_higher.label },
  { href: AUDIENCE_GUIDES.admin_schools.helpHref, label: AUDIENCE_GUIDES.admin_schools.label },
  { href: AUDIENCE_GUIDES.admin_higher.helpHref, label: AUDIENCE_GUIDES.admin_higher.label },
  { href: HELP_CENTER_HREF, label: "Help center" },
  { href: "/", label: "Home" },
];

function active(pathname: string, href: string): boolean {
  if (href.includes("?")) return false;
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Hidable full menu for OdelPay lobbies / home hub (complements bottom dock). */
export function TuitionHubMobileMenu({
  title = "OdelPay",
  subtitle = "Schools · higher institutions · pay",
}: Props) {
  const pathname = usePathname() ?? "";
  const items = useMemo(
    () =>
      TUITION_DESTINATIONS.map((d) => ({
        href: d.href,
        label: d.label,
        active: active(pathname, d.href),
      })),
    [pathname],
  );

  return (
    <DashboardMobileChrome
      title={title}
      subtitle={subtitle}
      accent="cyan"
      panelId="tuition-hub-mobile-menu"
      backHref="/"
      backLabel="Lobby"
      items={items}
    />
  );
}
