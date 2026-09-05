/**
 * Canonical ODEL HUB hub registry — extend by adding entries and UI will pick them up
 * from ordered lists (home switcher, headers, cross-links).
 */

export type HubKey = "tuition" | "play" | "dex" | "developers";

export type HubDefinition = {
  id: HubKey;
  label: string;
  shortLabel: string;
  description: string;
  /** Home landing: `/?hub=…` */
  homeQueryValue: string;
  /** Primary app entry */
  basePath: string;
  /** Sub-routes this hub owns (for deep links & future modules) */
  routes?: Record<string, string>;
  /**
   * Canonical upstream for merged/synced surfaces (Play Hub tracks ura-pearl-data-center).
   * Use `npm run sync:play-hub` to pull clicker + game APIs + docs.
   */
  upstream?: { github: string; live?: string; syncCommand?: string };
};

export const HUBS: Record<HubKey, HubDefinition> = {
  tuition: {
    id: "tuition",
    label: "Tuition Hub",
    shortLabel: "Tuition",
    description: "Programme fees, receipts, OpenPayGB (Mbiyo / LivePay rails), TON settlement.",
    homeQueryValue: "tuition",
    basePath: "/pay/default",
    routes: {
      pay: "/pay/default",
      receipts: "/receipt",
      admin: "/school/login",
    },
  },
  play: {
    id: "play",
    label: "Play Hub",
    shortLabel: "Play",
    description: "Gamification — learn, services, earn, guild.",
    homeQueryValue: "play",
    basePath: "/play",
    routes: {
      mini: "/play",
      builtin: "/clicker",
      landing: "/",
    },
    upstream: {
      github: "https://github.com/urapearlug-sys/ura-pearl-data-center",
      live: "https://ura-pearl-data-center.vercel.app",
      syncCommand: "npm run sync:play-hub",
    },
  },
  dex: {
    id: "dex",
    label: "Dex Hub",
    shortLabel: "Dex",
    description: "Onramp & offramp between fiat / mobile money and TON — extends OpenPayGB rails & wallet flows.",
    homeQueryValue: "dex",
    basePath: "/dex",
    routes: {
      onramp: "/dex/onramp",
      offramp: "/dex/offramp",
      convert: "/dex/convert",
      buy: "/dex/buy",
      amm: "/dex/amm",
      p2p: "/dex/p2p",
    },
  },
  developers: {
    id: "developers",
    label: "Developers Hub",
    shortLabel: "Devs",
    description: "Self-serve Partner API, OAuth apps, Dex write API, and OPGB integrator docs.",
    homeQueryValue: "developers",
    basePath: "/developers",
    routes: {
      dashboard: "/developers/dashboard",
      register: "/developers/register",
      help: "/help?hub=dex",
      docs: "/help/integrate-odel-hub",
    },
  },
};

/** Stable order for tabs and marketing sections */
export const HUB_ORDER: HubKey[] = ["tuition", "play", "dex", "developers"];

export function homeHubFromSearchParam(value: string | null): HubKey {
  if (value === HUBS.play.homeQueryValue) return "play";
  if (value === HUBS.dex.homeQueryValue) return "dex";
  if (value === HUBS.developers.homeQueryValue) return "developers";
  return "tuition";
}

export function homeUrlForHub(key: HubKey): string {
  if (key === "tuition") return `/?hub=${HUBS.tuition.homeQueryValue}`;
  return `/?hub=${HUBS[key].homeQueryValue}`;
}
