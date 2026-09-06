/**
 * True standalone app registry — host or `STANDALONE_APP` env selects one product surface.
 * See docs/STANDALONE_APPS.md for subdomain mapping on Vercel.
 *
 * Note: allowedPathPrefixes are fully inlined (no spread) so Edge middleware bundles reliably.
 */

export type StandaloneAppId =
  | "odelpay_universities"
  | "odelpay_schools"
  | "openpaygb"
  | "dex"
  | "play"
  | "odelhub_devs";

export type StandaloneAppDefinition = {
  id: StandaloneAppId;
  title: string;
  subtitle: string;
  description: string;
  lobbyPath: string;
  /** Hostnames (no port) — exact match or `*.suffix` wildcard */
  hostPatterns: string[];
  /** Path prefixes allowed when this app is active (assets + `/api` added automatically) */
  allowedPathPrefixes: readonly string[];
  registerHref?: string;
  hideEcosystemLinks: boolean;
};

export const STANDALONE_APPS: readonly StandaloneAppDefinition[] = [
  {
    id: "odelpay_universities",
    title: "OdelPay Universities",
    subtitle: "Higher institutions",
    description:
      "Programme fees, TON and mobile-money checkout, receipts, and institution admin for universities and polytechnics.",
    lobbyPath: "/OdelPayUniversities",
    hostPatterns: [
      "odelpay-universities.vercel.app",
      "universities.odelpay.vercel.app",
      "universities.odelpay.com",
      "universities.openpaygb.com",
    ],
    allowedPathPrefixes: [
      "/OdelPayUniversities",
      "/pay",
      "/receipt",
      "/admin",
      "/school",
      "/school-admin",
      "/login",
      "/student",
      "/staff",
      "/my",
      "/help",
      "/tma",
    ],
    registerHref: "/admin/register?segment=higher",
    hideEcosystemLinks: true,
  },
  {
    id: "odelpay_schools",
    title: "OdelPay Schools",
    subtitle: "Primary & secondary",
    description:
      "School workspace registration, term-based fee schedules, receipts, and school admin — tuned per tenant.",
    lobbyPath: "/OdelPaySchools",
    hostPatterns: [
      "odelpay-schools.vercel.app",
      "schools.odelpay.vercel.app",
      "schools.odelpay.com",
      "schools.openpaygb.com",
    ],
    allowedPathPrefixes: [
      "/OdelPaySchools",
      "/pay",
      "/receipt",
      "/admin",
      "/school",
      "/school-admin",
      "/login",
      "/student",
      "/staff",
      "/my",
      "/help",
      "/tma",
    ],
    registerHref: "/admin/register?segment=schools",
    hideEcosystemLinks: true,
  },
  {
    id: "openpaygb",
    title: "OpenPayGB",
    subtitle: "Global payments layer",
    description:
      "Closed-loop UGX card, OPGB wallet, Dex buy/swap/P2P, MoMo and TON rails — consumer wallet and settlement.",
    lobbyPath: "/opgb",
    hostPatterns: [
      "openpaygb.vercel.app",
      "opgb.odelpay.vercel.app",
      "opgb.openpaygb.com",
      "wallet.openpaygb.com",
    ],
    allowedPathPrefixes: ["/opgb", "/student", "/my", "/dex", "/receipt", "/help", "/tma"],
    hideEcosystemLinks: true,
  },
  {
    id: "dex",
    title: "Dex Hub",
    subtitle: "Onramp & offramp",
    description: "Buy, swap, P2P, and offramp between fiat, mobile money, and TON — OpenPayGB rails.",
    lobbyPath: "/dex",
    hostPatterns: ["dex.odelpay.vercel.app", "dexhub.odelpay.vercel.app", "dex.openpaygb.com"],
    allowedPathPrefixes: ["/dex", "/student", "/my", "/opgb", "/receipt", "/help", "/tma"],
    hideEcosystemLinks: true,
  },
  {
    id: "play",
    title: "Play Hub",
    subtitle: "Learn, earn & guild",
    description: "Telegram mini-app gamification — learn, services, earn rewards, and guild.",
    lobbyPath: "/clicker",
    hostPatterns: ["play.odelpay.vercel.app", "odelpay-play.vercel.app", "play.openpaygb.com"],
    allowedPathPrefixes: ["/clicker", "/tma", "/playhub"],
    hideEcosystemLinks: true,
  },
  {
    id: "odelhub_devs",
    title: "OdelHub Devs",
    subtitle: "ODELPay HUB Developers",
    description:
      "Self-serve app registry, Partner API keys, Dex payment intents, OPGB balance reads, OAuth client credentials, and webhook endpoints. Developers can open every product side; each portal still requires its own sign-in.",
    lobbyPath: "/developers",
    hostPatterns: [
      "odelhub-devs.vercel.app",
      "developers.odelpay.vercel.app",
      "devs.odelhub.com",
      "developers.openpaygb.com",
    ],
    // Keep inlined (no import) for Edge middleware. Mirror lib/access-surfaces ODELHUB_DEVS_ALLOWED_PATH_PREFIXES.
    allowedPathPrefixes: [
      "/developers",
      "/docs",
      "/help",
      "/tma",
      "/login",
      "/admin",
      "/school",
      "/school-admin",
      "/student",
      "/staff",
      "/my",
      "/pay",
      "/receipt",
      "/OdelPayUniversities",
      "/OdelPaySchools",
      "/opgb",
      "/dex",
    ],
    hideEcosystemLinks: true,
  },
];

export const STANDALONE_APP_IDS: readonly StandaloneAppId[] = STANDALONE_APPS.map((a) => a.id);

const STANDALONE_APP_ENV = "STANDALONE_APP";

/** Asset and framework paths always pass through standalone isolation. */
export const STANDALONE_PASSTHROUGH_PREFIXES = [
  "/_next",
  "/api",
  "/playhub",
  "/opengraph-image",
  "/tonconnect-manifest.json",
] as const;

export function standaloneAppById(id: StandaloneAppId): StandaloneAppDefinition {
  const app = STANDALONE_APPS.find((a) => a.id === id);
  if (!app) throw new Error(`Unknown standalone app: ${id}`);
  return app;
}

export function parseStandaloneAppId(value: string | null | undefined): StandaloneAppId | null {
  const v = value?.trim();
  if (!v) return null;
  return STANDALONE_APP_IDS.includes(v as StandaloneAppId) ? (v as StandaloneAppId) : null;
}

export function normalizeHost(host: string | null | undefined): string {
  return (host ?? "").toLowerCase().split(":")[0] ?? "";
}

export function hostMatchesPattern(host: string, pattern: string): boolean {
  const h = normalizeHost(host);
  const p = pattern.toLowerCase();
  if (p.startsWith("*.")) {
    const suffix = p.slice(2);
    return h === suffix || h.endsWith(`.${suffix}`);
  }
  return h === p;
}

export function standaloneAppFromHost(host: string | null | undefined): StandaloneAppDefinition | null {
  const h = normalizeHost(host);
  if (!h) return null;
  return STANDALONE_APPS.find((app) => app.hostPatterns.some((p) => hostMatchesPattern(h, p))) ?? null;
}

export function standaloneAppFromEnv(env: NodeJS.ProcessEnv = process.env): StandaloneAppDefinition | null {
  const id = parseStandaloneAppId(env[STANDALONE_APP_ENV]);
  return id ? standaloneAppById(id) : null;
}

export function resolveStandaloneApp(input: {
  host?: string | null;
  env?: NodeJS.ProcessEnv;
}): StandaloneAppDefinition | null {
  return standaloneAppFromEnv(input.env) ?? standaloneAppFromHost(input.host);
}

export function isPassthroughStandalonePath(pathname: string): boolean {
  if (pathname === "/favicon.ico" || pathname === "/manifest.webmanifest") return true;
  if (/\.(svg|png|jpg|jpeg|gif|webp|ico|woff2?|ttf|json)$/i.test(pathname)) return true;
  return STANDALONE_PASSTHROUGH_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

export function isPathAllowedForStandalone(pathname: string, app: StandaloneAppDefinition): boolean {
  if (isPassthroughStandalonePath(pathname)) return true;
  if (pathname === "/" || pathname === "") return true;
  return app.allowedPathPrefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function standaloneMetadataForApp(
  app: StandaloneAppDefinition,
): { title: string; description: string } {
  return {
    title: `${app.title} — ${app.subtitle}`,
    description: app.description,
  };
}
