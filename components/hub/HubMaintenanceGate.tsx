import Link from "next/link";
import { redirect } from "next/navigation";
import type { HubKey } from "@/lib/ecosystem/hubs";
import { HUBS } from "@/lib/ecosystem/hubs";
import { isHubUnderMaintenance } from "@/lib/hub-maintenance";
import { isHubHidden } from "@/lib/hub-visibility";
import { getPlatformBranding } from "@/lib/platform-customisation";

const HUB_ACCENT: Record<HubKey, string> = {
  tuition: "cyan",
  play: "sky",
  dex: "violet",
  developers: "emerald",
};

export async function HubMaintenanceGate({
  hub,
  children,
  allowWhenHidden = false,
}: {
  hub: HubKey;
  children: React.ReactNode;
  /** When true, keep the surface available even if the hub is hidden or under maintenance (OpenPayGB provider). */
  allowWhenHidden?: boolean;
}) {
  if (allowWhenHidden) {
    return <>{children}</>;
  }

  /** Hide = hub disappears entirely (redirect home). Maintenance = hub stays listed but blocked. */
  if (await isHubHidden(hub)) {
    redirect("/");
  }

  const underMaintenance = await isHubUnderMaintenance(hub);
  if (!underMaintenance) return <>{children}</>;

  const [def, branding] = await Promise.all([Promise.resolve(HUBS[hub]), getPlatformBranding()]);
  const accent = HUB_ACCENT[hub];
  const brand = branding.platformDisplayName || "ODEL HUB";
  const customMessage = branding.hubMaintenanceMessage.trim();

  return (
    <div className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center px-6 py-16 text-center">
      <p
        className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${
          accent === "cyan"
            ? "border-cyan-400/30 bg-cyan-500/10 text-cyan-200"
            : accent === "violet"
              ? "border-violet-400/30 bg-violet-500/10 text-violet-200"
              : accent === "emerald"
                ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-200"
                : "border-sky-400/30 bg-sky-500/10 text-sky-200"
        }`}
      >
        Under maintenance
      </p>
      <h1 className="mt-6 text-2xl font-semibold text-white">{def.label} is under maintenance</h1>
      <p className="mt-3 text-sm leading-relaxed text-slate-400">
        {customMessage ||
          `${def.label} is temporarily unavailable while we make improvements. Other hubs may still be open — try again later or return to the home page.`}
      </p>
      <Link
        href="/"
        className="mt-8 inline-flex min-h-[44px] items-center rounded-xl border border-white/15 bg-white/[0.06] px-5 py-2.5 text-sm font-semibold text-slate-100 hover:border-cyan-400/35 hover:bg-white/[0.09]"
      >
        Back to {brand} home
      </Link>
    </div>
  );
}
