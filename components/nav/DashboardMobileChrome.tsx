"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { usePathname } from "next/navigation";
import {
  MobileNavDrawer,
  MobileNavMenuButton,
  type MobileNavAccent,
  type MobileNavItem,
  type MobileNavSection,
} from "@/components/nav/MobileNavDrawer";
import { PageBackLink } from "@/components/nav/PageBackLink";

type Props = {
  title: string;
  subtitle?: string;
  accent?: MobileNavAccent;
  /** Primary navigation destinations */
  items: MobileNavItem[];
  /** Optional second section (e.g. Guides) */
  secondarySections?: MobileNavSection[];
  afterSections?: React.ReactNode;
  footer?: React.ReactNode;
  /** Extra header actions (logout link, etc.) */
  trailing?: React.ReactNode;
  panelId?: string;
  /** Optional back control — shown left of the title on mobile dashboards. */
  backHref?: string;
  backLabel?: string;
};

/**
 * Compact mobile top bar + hidable full menu drawer.
 * Replaces horizontal scroll strips on dashboard shells.
 */
export function DashboardMobileChrome({
  title,
  subtitle,
  accent = "cyan",
  items,
  secondarySections = [],
  afterSections,
  footer,
  trailing,
  panelId,
  backHref,
  backLabel = "Back",
}: Props) {
  const pathname = usePathname() ?? "";
  const [open, setOpen] = useState(false);
  const autoId = useId();
  const id = panelId ?? `dash-mobile-menu-${autoId.replace(/:/g, "")}`;

  const close = useCallback(() => setOpen(false), []);

  // Close drawer on route change
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const sections: MobileNavSection[] = [
    {
      id: "primary",
      label: "Navigate",
      items: items.map((item) => ({
        ...item,
        active: item.active,
      })),
    },
    ...secondarySections,
  ];

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0a101f]/95 backdrop-blur-md md:hidden">
        <div className="flex items-center justify-between gap-2 px-3 py-2.5">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            {backHref ? <PageBackLink href={backHref} label={backLabel} compact /> : null}
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-white" title={title}>
                {title}
              </p>
              {subtitle ? (
                <p className="truncate text-[10px] text-slate-500" title={subtitle}>
                  {subtitle}
                </p>
              ) : null}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {trailing}
            <MobileNavMenuButton
              open={open}
              onClick={() => setOpen((v) => !v)}
              controlsId={id}
              accent={accent}
            />
          </div>
        </div>
      </header>
      <MobileNavDrawer
        open={open}
        onClose={close}
        title={title}
        accent={accent}
        breakpointHideClassName="md:hidden"
        panelId={id}
        sections={sections}
        afterSections={afterSections}
        footer={footer}
      />
    </>
  );
}
