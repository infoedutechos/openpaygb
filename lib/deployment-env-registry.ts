/**
 * Canonical deployment environment variable registry (server-only metadata).
 * Values are never stored here — only names, labels, and documentation.
 */

import { listCustomRegistryEntries } from "@/lib/deployment-env-custom-registry";

export type EnvRequirement = "always" | "production" | "optional" | "all";

export type EnvVarDefinition = {
  name: string;
  label: string;
  description: string;
  sensitive: boolean;
  requirement: EnvRequirement;
};

export type EnvGroupDefinition = {
  id: string;
  title: string;
  description: string;
  docsPath?: string;
  masterUiAnchor?: string;
  vars: EnvVarDefinition[];
};

export const DEPLOYMENT_ENV_GROUPS: EnvGroupDefinition[] = [
  {
    id: "core",
    title: "Core deployment",
    description: "Database, auth, and public site URL.",
    docsPath: "docs/LOCAL_DEV_AND_CREDENTIALS.md",
    vars: [
      {
        name: "DATABASE_URL",
        label: "Database URL",
        description: "MongoDB connection string for Prisma (Atlas).",
        sensitive: true,
        requirement: "always",
      },
      {
        name: "JWT_SECRET",
        label: "JWT secret",
        description: "Signs admin, student, checkout, and receipt tokens (min 16 chars).",
        sensitive: true,
        requirement: "always",
      },
      {
        name: "NEXT_PUBLIC_APP_URL",
        label: "Public app URL",
        description: "Canonical HTTPS origin for emails, webhooks, and OAuth redirects.",
        sensitive: false,
        requirement: "always",
      },
      {
        name: "NODE_ENV",
        label: "Node environment",
        description: "development | production — affects secret guards and logging.",
        sensitive: false,
        requirement: "optional",
      },
      {
        name: "VERCEL_ENV",
        label: "Vercel environment",
        description: "Set automatically on Vercel (production / preview / development).",
        sensitive: false,
        requirement: "optional",
      },
      {
        name: "HEALTH_CHECK_SECRET",
        label: "Health check secret",
        description: "Bearer auth for GET /api/health in production (optional but recommended).",
        sensitive: true,
        requirement: "production",
      },
    ],
  },
  {
    id: "checkout-fx",
    title: "Checkout & FX",
    description: "Tuition quoting, platform fee fallback, and TON settlement wallet.",
    masterUiAnchor: "platform-processing-fee",
    docsPath: "docs/LOCAL_DEV_AND_CREDENTIALS.md",
    vars: [
      {
        name: "CHECKOUT_PLATFORM_FEE_UGX",
        label: "Platform fee (env fallback)",
        description: "UGX processing charge when Master default is “use env”.",
        sensitive: false,
        requirement: "optional",
      },
      {
        name: "DEFAULT_UGX_PER_TON",
        label: "Default UGX per TON",
        description: "Fallback FX when live rates and DB overrides are unavailable.",
        sensitive: false,
        requirement: "optional",
      },
      {
        name: "FX_LIVE_ENABLED",
        label: "Live FX enabled",
        description: "Fetch live TON/UGX from market sources when true.",
        sensitive: false,
        requirement: "optional",
      },
      {
        name: "ODELHUB_TON_WALLET_ADDRESS",
        label: "Settlement TON wallet",
        description: "Wallet address shown to payers for on-chain tuition.",
        sensitive: false,
        requirement: "always",
      },
    ],
  },
  {
    id: "livepay",
    title: "LivePay (Uganda MoMo)",
    description: "OpenPayGB rail — MTN/Airtel UGX collections via LivePay REST API.",
    masterUiAnchor: "ug-momo-credentials",
    docsPath: "docs/LIVEPAY_INTEGRATION_ASSESSMENT.md",
    vars: [
      {
        name: "LIVEPAY_API_KEY",
        label: "API key",
        description: "Bearer token for collect-money and status APIs (full key: keyId.secret).",
        sensitive: true,
        requirement: "optional",
      },
      {
        name: "LIVEPAY_ACCOUNT_NUMBER",
        label: "Account number",
        description: "Business account sent as accountNumber on collect (e.g. LP…).",
        sensitive: false,
        requirement: "optional",
      },
      {
        name: "LIVEPAY_KEY_ID",
        label: "Key ID (dashboard)",
        description: "LivePay dashboard Key ID / prefix — informational only; API uses LIVEPAY_API_KEY.",
        sensitive: false,
        requirement: "optional",
      },
      {
        name: "LIVEPAY_WEBHOOK_SECRET",
        label: "Webhook secret",
        description: "HMAC signing key for POST /api/webhooks/livepay.",
        sensitive: true,
        requirement: "production",
      },
      {
        name: "LIVEPAY_WEBHOOK_URL",
        label: "Webhook URL override",
        description: "Full webhook URL if dashboard differs from NEXT_PUBLIC_APP_URL.",
        sensitive: false,
        requirement: "optional",
      },
      {
        name: "OPENPAYGB_CARD_MOMO_SANDBOX",
        label: "OpenPayGB card MoMo sandbox",
        description:
          "1 = force instant sandbox activate/fund; 0 = require live PSP. Default: sandbox only in non-prod when no LivePay/Relworx/VixonPay keys.",
        sensitive: false,
        requirement: "optional",
      },
    ],
  },
  {
    id: "vixonpay",
    title: "VixonPay (Uganda MoMo)",
    description:
      "Uganda UGX mobile money collections via VixonPay API — OpenPayGB card top-ups and checkout.",
    masterUiAnchor: "ug-momo-credentials",
    docsPath: "https://docs.vixonpay.com/pay#description/getting-started",
    vars: [
      {
        name: "VIXONPAY_API_KEY",
        label: "API key",
        description: "Bearer token from VixonPay dashboard → Settings → API Keys.",
        sensitive: true,
        requirement: "optional",
      },
      {
        name: "VIXONPAY_WEBHOOK_SECRET",
        label: "Webhook secret",
        description: "HMAC SHA512 key for X-VixonPay-Signature webhook verification.",
        sensitive: true,
        requirement: "optional",
      },
      {
        name: "VIXONPAY_WEBHOOK_URL",
        label: "Webhook URL",
        description: "Public URL for VixonPay transaction webhooks (configure in dashboard).",
        sensitive: false,
        requirement: "optional",
      },
    ],
  },
  {
    id: "relworx",
    title: "Relworx (East Africa MoMo)",
    description: "OpenPayGB rail — UG/KE/TZ mobile money via Relworx Payments API v2.",
    masterUiAnchor: "ug-momo-credentials",
    docsPath: "docs/deployment/RELWORX_INVESTIGATION.md",
    vars: [
      {
        name: "RELWORX_API_KEY",
        label: "API key",
        description: "Bearer token for request-payment and status APIs.",
        sensitive: true,
        requirement: "optional",
      },
      {
        name: "RELWORX_ACCOUNT_NO",
        label: "Account number",
        description: "Business account_no on Relworx collect requests.",
        sensitive: false,
        requirement: "optional",
      },
      {
        name: "RELWORX_WEBHOOK_KEY",
        label: "Webhook signing key",
        description: "Relworx-Signature HMAC for POST /api/webhooks/relworx.",
        sensitive: true,
        requirement: "production",
      },
      {
        name: "RELWORX_WEBHOOK_SECRET",
        label: "Webhook secret (alias)",
        description: "Optional alias accepted alongside RELWORX_WEBHOOK_KEY.",
        sensitive: true,
        requirement: "optional",
      },
      {
        name: "RELWORX_WEBHOOK_URL",
        label: "Webhook URL override",
        description: "Full webhook URL if dashboard differs from NEXT_PUBLIC_APP_URL.",
        sensitive: false,
        requirement: "optional",
      },
      {
        name: "RELWORX_CURRENCY",
        label: "Checkout currency",
        description: "UGX (default), KES, or TZS for Relworx collect.",
        sensitive: false,
        requirement: "optional",
      },
      {
        name: "RELWORX_ENABLED",
        label: "Rail enabled flag",
        description: "Set false to hide Relworx even when keys exist.",
        sensitive: false,
        requirement: "optional",
      },
    ],
  },
  {
    id: "mbiyo",
    title: "Mbiyo (OpenPayGB)",
    description: "Multi-country MoMo via MbiyoPay merchant API.",
    masterUiAnchor: "ug-momo-credentials",
    docsPath: "docs/MBIYO_WEBHOOK_SETUP.md",
    vars: [
      {
        name: "MBIYO_SECRET_KEY",
        label: "Secret API key",
        description: "Server-only Bearer key for payins (never NEXT_PUBLIC_*).",
        sensitive: true,
        requirement: "optional",
      },
      {
        name: "MBIYO_WEBHOOK_SECRET",
        label: "Webhook secret",
        description: "HMAC body signature for POST /api/webhooks/mbiyo.",
        sensitive: true,
        requirement: "production",
      },
      {
        name: "NEXT_PUBLIC_MBIYO_PUBLIC_KEY",
        label: "Public key",
        description: "Client-side Mbiyo public key (Live/Test pair with secret key).",
        sensitive: false,
        requirement: "optional",
      },
      {
        name: "MBIYO_API_BASE_URL",
        label: "API base URL",
        description: "Mbiyo REST base (default dashboard.mbiyo.africa).",
        sensitive: false,
        requirement: "optional",
      },
    ],
  },
  {
    id: "momo",
    title: "MoMo bridge",
    description: "Legacy MTN/Airtel bridge webhook and collection URL.",
    masterUiAnchor: "ug-momo-credentials",
    vars: [
      {
        name: "MOMO_WEBHOOK_SECRET",
        label: "Webhook secret",
        description: "Header x-momo-webhook-secret for POST /api/webhooks/momo.",
        sensitive: true,
        requirement: "production",
      },
      {
        name: "MOMO_COLLECTION_URL",
        label: "Collection URL",
        description: "Upstream MoMo collection endpoint.",
        sensitive: false,
        requirement: "optional",
      },
      {
        name: "MOMO_PROVIDER",
        label: "Provider",
        description: "MoMo provider identifier.",
        sensitive: false,
        requirement: "optional",
      },
      {
        name: "MOMO_SUBSCRIPTION_KEY",
        label: "Subscription key",
        description: "MoMo API subscription key.",
        sensitive: true,
        requirement: "optional",
      },
    ],
  },
  {
    id: "ton",
    title: "TON on-chain",
    description: "TonAPI, confirmation cron, and pay widget keys.",
    docsPath: "docs/LOCAL_DEV_AND_CREDENTIALS.md",
    vars: [
      {
        name: "TONAPI_KEY",
        label: "TonAPI key",
        description: "Improves on-chain confirm rate limits.",
        sensitive: true,
        requirement: "optional",
      },
      {
        name: "TON_CONFIRM_ENABLED",
        label: "TON confirm enabled",
        description: "Enable automatic on-chain payment confirmation.",
        sensitive: false,
        requirement: "optional",
      },
      {
        name: "CRON_SECRET",
        label: "Cron secret",
        description: "Bearer auth for /api/cron/* (required in production).",
        sensitive: true,
        requirement: "production",
      },
      {
        name: "TON_PAY_API_KEY",
        label: "TON Pay API key",
        description: "Server TON Pay integration key.",
        sensitive: true,
        requirement: "optional",
      },
      {
        name: "NEXT_PUBLIC_TON_PAY_API_KEY",
        label: "TON Pay public key",
        description: "Client TON Pay widget key.",
        sensitive: false,
        requirement: "optional",
      },
    ],
  },
  {
    id: "email",
    title: "Email (Brevo / Resend)",
    description:
      "Transactional email for verification, password reset, receipts. Brevo (free tier) is preferred when BREVO_API_KEY is set.",
    docsPath: "docs/ORGANIZATION_REGISTRATION.md",
    vars: [
      {
        name: "EMAIL_PROVIDER",
        label: "Email provider",
        description: "auto (default), brevo, or resend. Auto picks Brevo when BREVO_API_KEY is set.",
        sensitive: false,
        requirement: "optional",
      },
      {
        name: "BREVO_API_KEY",
        label: "Brevo API key",
        description: "From Brevo → SMTP & API → API keys. Free tier supports verification and transactional mail.",
        sensitive: true,
        requirement: "optional",
      },
      {
        name: "RESEND_API_KEY",
        label: "Resend API key",
        description: "Legacy alternative when Brevo is not used.",
        sensitive: true,
        requirement: "optional",
      },
      {
        name: "TRANSACTIONAL_EMAIL_FROM",
        label: "From address (preferred)",
        description: "Sender e.g. ODELPay HUB <noreply@yourdomain.com>. Falls back to RESEND_FROM.",
        sensitive: false,
        requirement: "production",
      },
      {
        name: "RESEND_FROM",
        label: "From address (legacy alias)",
        description: "Same as TRANSACTIONAL_EMAIL_FROM if the preferred key is unset.",
        sensitive: false,
        requirement: "optional",
      },
    ],
  },
  {
    id: "telegram",
    title: "Telegram bot & announcements",
    description:
      "Tuition bot webhooks, Master Admin Telegram user notifications, and optional announcement channel posts.",
    masterUiAnchor: "platform-communications",
    docsPath: "docs/LOCAL_DEV_AND_CREDENTIALS.md",
    vars: [
      {
        name: "BOT_TOKEN",
        label: "Play / broadcast bot token",
        description:
          "Primary BotFather token. Save in Master Admin → Deployment environment, then Sync to Vercel. See docs/TELEGRAM_BOT_DEPLOYMENT.md.",
        sensitive: true,
        requirement: "optional",
      },
      {
        name: "TELEGRAM_BOT_TOKEN",
        label: "Tuition bot token",
        description:
          "Tuition webhook bot (used when BOT_TOKEN is unset). Paste from BotFather; sync to Vercel via Master Admin.",
        sensitive: true,
        requirement: "optional",
      },
      {
        name: "TELEGRAM_ANNOUNCEMENT_CHANNEL_ID",
        label: "Announcement channel ID",
        description: "Channel for optional “post to Telegram channel” from Master / Play admin notifications.",
        sensitive: false,
        requirement: "optional",
      },
      {
        name: "TELEGRAM_ORG_SLUG",
        label: "Telegram org slug",
        description: "Single-tenant bot binding for tuition Telegram flow (default: default).",
        sensitive: false,
        requirement: "optional",
      },
      {
        name: "TELEGRAM_WEBHOOK_SECRET",
        label: "Webhook secret",
        description: "Optional header check for POST /api/webhooks/telegram.",
        sensitive: true,
        requirement: "optional",
      },
    ],
  },
  {
    id: "support-public",
    title: "Public support (UI)",
    description: "Shown in footer/support widget; Master Social settings can override phone/email.",
    masterUiAnchor: "platform-social",
    vars: [
      {
        name: "NEXT_PUBLIC_SUPPORT_PHONE",
        label: "Support phone",
        description: "Public support phone (non-secret).",
        sensitive: false,
        requirement: "optional",
      },
      {
        name: "NEXT_PUBLIC_SUPPORT_EMAIL",
        label: "Support email",
        description: "Public support email (non-secret).",
        sensitive: false,
        requirement: "optional",
      },
      {
        name: "NEXT_PUBLIC_COMMUNITY_SUPPORT_URL",
        label: "Community Support (WhatsApp)",
        description: "WhatsApp group invite URL; Master Social settings can override.",
        sensitive: false,
        requirement: "optional",
      },
      {
        name: "NEXT_PUBLIC_SUPPORT_TELEGRAM_URL",
        label: "Support Telegram URL",
        description: "Link to Telegram support channel.",
        sensitive: false,
        requirement: "optional",
      },
    ],
  },
  {
    id: "vercel-sync",
    title: "Vercel autonomous sync",
    description:
      "When set, Master Admin auto-scans the codebase for env names and pushes merged dashboard values to your Vercel project.",
    masterUiAnchor: "deployment-environment",
    docsPath: "docs/PRODUCTION_GO_LIVE.md",
    vars: [
      {
        name: "VERCEL_ACCESS_TOKEN",
        label: "Vercel access token",
        description: "From Vercel → Account → Tokens. Needs project env read/write scope.",
        sensitive: true,
        requirement: "optional",
      },
      {
        name: "VERCEL_PROJECT_ID",
        label: "Vercel project ID",
        description: "Project → Settings → General → Project ID (prj_…).",
        sensitive: false,
        requirement: "optional",
      },
      {
        name: "VERCEL_TEAM_ID",
        label: "Vercel team ID (optional)",
        description: "Team projects only — Team Settings → General → Team ID.",
        sensitive: false,
        requirement: "optional",
      },
      {
        name: "DEPLOYMENT_ENV_AUTONOMOUS_SYNC",
        label: "Autonomous sync enabled",
        description: "true (default) — auto registry scan on load and Vercel push when token + project ID are set. Use false to disable.",
        sensitive: false,
        requirement: "optional",
      },
    ],
  },
  {
    id: "integrations",
    title: "Partner & bridge",
    description: "External webhooks and optional OpenAI support chat.",
    masterUiAnchor: "partner-integrations",
    vars: [
      {
        name: "BRIDGE_WEBHOOK_URL",
        label: "Bridge webhook URL",
        description: "UGX→TON bridge callback URL.",
        sensitive: false,
        requirement: "optional",
      },
      {
        name: "BRIDGE_WEBHOOK_SECRET",
        label: "Bridge webhook secret",
        description: "Authenticates bridge callbacks.",
        sensitive: true,
        requirement: "optional",
      },
      {
        name: "OPENAI_API_KEY",
        label: "OpenAI API key",
        description: "Optional support chat integration.",
        sensitive: true,
        requirement: "optional",
      },
    ],
  },
  {
    id: "card-acquiring",
    title: "Bank card acquiring (Visa/MC)",
    description: "Flutterwave or Paystack hosted checkout for PaymentRail.card.",
    docsPath: "docs/platform/OPENPAYGB_GATEWAY_MATURITY.md",
    masterUiAnchor: "card-network",
    vars: [
      {
        name: "CARD_ACQUIRING_PROVIDER",
        label: "Card acquiring provider",
        description: "flutterwave | paystack (auto-detects from secret keys if empty).",
        sensitive: false,
        requirement: "optional",
      },
      {
        name: "FLUTTERWAVE_SECRET_KEY",
        label: "Flutterwave secret key",
        description: "Server secret for hosted card payments.",
        sensitive: true,
        requirement: "optional",
      },
      {
        name: "FLUTTERWAVE_WEBHOOK_SECRET",
        label: "Flutterwave webhook secret",
        description: "Dashboard verif-hash / webhook secret.",
        sensitive: true,
        requirement: "optional",
      },
      {
        name: "PAYSTACK_SECRET_KEY",
        label: "Paystack secret key",
        description: "Server secret; also signs webhooks (HMAC-SHA512).",
        sensitive: true,
        requirement: "optional",
      },
    ],
  },
  {
    id: "merchant-cashout",
    title: "Merchant MoMo cashout",
    description: "LivePay/Relworx send-money for funded merchant/school cashouts.",
    docsPath: "docs/platform/OPENPAYGB_PAYMENT_PROVIDER.md",
    masterUiAnchor: "deployment-environment",
    vars: [
      {
        name: "OPENPAYGB_CASHOUT_LIVE",
        label: "MoMo cashout live mode",
        description:
          "Omit or =1 to auto-send when LivePay/Relworx configured; =0 forces queue-only.",
        sensitive: false,
        requirement: "optional",
      },
      {
        name: "OPENPAYGB_CASHOUT_RAIL",
        label: "Preferred cashout rail",
        description: "livepay | relworx (default: first configured).",
        sensitive: false,
        requirement: "optional",
      },
      {
        name: "OPENPAYGB_CHARGES_SANDBOX",
        label: "Merchant charges sandbox",
        description: "1 = force sandbox merchant MoMo charges; 0 = force live; omit = auto.",
        sensitive: false,
        requirement: "optional",
      },
    ],
  },
  {
    id: "card-issuing",
    title: "Network Visa/MC issuing",
    description:
      "LivePay card API or Visa Developer (developer.visa.com) mTLS. Requires BIN sponsor for production PANs.",
    docsPath: "docs/platform/CARD_ISSUING.md",
    masterUiAnchor: "card-network",
    vars: [
      {
        name: "CARD_ISSUING_PROVIDER",
        label: "Issuing provider",
        description: "livepay | visa_vdp",
        sensitive: false,
        requirement: "optional",
      },
      {
        name: "LIVEPAY_CARD_ISSUING_URL",
        label: "LivePay card issuing URL",
        description: "Full create-card endpoint from LivePay (when documented).",
        sensitive: false,
        requirement: "optional",
      },
      {
        name: "VISA_USER_ID",
        label: "Visa API user id",
        description: "From Visa Developer project credentials.",
        sensitive: true,
        requirement: "optional",
      },
      {
        name: "VISA_PASSWORD",
        label: "Visa API password",
        description: "From Visa Developer project credentials.",
        sensitive: true,
        requirement: "optional",
      },
      {
        name: "VISA_CERT_PATH",
        label: "Visa client cert path",
        description: "Path to mTLS certificate PEM (or use VISA_CERT_PEM).",
        sensitive: false,
        requirement: "optional",
      },
      {
        name: "VISA_KEY_PATH",
        label: "Visa client key path",
        description: "Path to mTLS private key PEM (or use VISA_KEY_PEM).",
        sensitive: true,
        requirement: "optional",
      },
      {
        name: "VISA_ISSUE_PATH",
        label: "Visa issue API path",
        description: "Program-specific path e.g. /vcpe/v2/pan/enrollment after BIN approval.",
        sensitive: false,
        requirement: "optional",
      },
      {
        name: "VISA_WEBHOOK_SECRET",
        label: "Visa issuing webhook secret",
        description: "Shared secret for POST /api/webhooks/visa-issuing.",
        sensitive: true,
        requirement: "optional",
      },
      {
        name: "VISA_ENV",
        label: "Visa environment",
        description: "sandbox (default) | production",
        sensitive: false,
        requirement: "optional",
      },
    ],
  },
];

const REGISTRY_BY_NAME = new Map(
  DEPLOYMENT_ENV_GROUPS.flatMap((g) => g.vars.map((v) => [v.name, v] as const)),
);

export function deploymentEnvRegistryNames(): string[] {
  return [...REGISTRY_BY_NAME.keys()];
}

export function getDeploymentEnvDefinition(name: string): EnvVarDefinition | undefined {
  return REGISTRY_BY_NAME.get(name);
}

export function isDeploymentEnvRegistryName(name: string): boolean {
  return REGISTRY_BY_NAME.has(name);
}

/** Built-in groups plus Master-added custom variables (async). */
export async function getMergedDeploymentEnvGroups(): Promise<EnvGroupDefinition[]> {
  const custom = await listCustomRegistryEntries();
  if (custom.length === 0) return DEPLOYMENT_ENV_GROUPS;

  const customGroup: EnvGroupDefinition = {
    id: "custom",
    title: "Custom (Master added)",
    description:
      "Variables you added from Master Admin. Set values below; they are encrypted like other dashboard overrides.",
    masterUiAnchor: "deployment-environment",
    vars: custom.map((c) => ({
      name: c.name,
      label: c.label,
      description: c.description,
      sensitive: c.sensitive,
      requirement: c.requirement,
    })),
  };

  return [...DEPLOYMENT_ENV_GROUPS, customGroup];
}

export async function getMergedDeploymentEnvRegistryNames(): Promise<string[]> {
  const groups = await getMergedDeploymentEnvGroups();
  return groups.flatMap((g) => g.vars.map((v) => v.name));
}
