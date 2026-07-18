import type { PlatformAudience } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { LEARN_CATEGORY_DEFAULTS } from "@/data/learn-defaults";

export type KnowledgeSeedArticle = {
  slug: string;
  title: string;
  summary: string;
  body: string;
  category: string;
  tags: string[];
  audience: PlatformAudience;
  sortOrder: number;
  source: string;
};

export const PLATFORM_KB_SEED: KnowledgeSeedArticle[] = [
  {
    slug: "tuition-pay-guest",
    title: "Pay tuition as a guest",
    summary: "Use the pay wizard without a student account.",
    body:
      "Open /pay or /pay/your-school-slug. Choose your programme, year, and semester, review fees, then pay with TON wallet, mobile money (LivePay, Relworx, Mbiyo), or OpenPayGB card if enabled. Receipts are emailed when Resend is configured.",
    category: "tuition",
    tags: ["pay", "guest", "checkout", "fees", "receipt"],
    audience: "tuition",
    sortOrder: 10,
    source: "seed",
  },
  {
    slug: "tuition-student-portal",
    title: "Student portal and pay",
    summary: "Sign in, view balance, and pay from the student hub.",
    body:
      "Students sign in at /student/login. From Student home you can view OpenPayGB card status, tuition balance, and recent payments. Pay tuition at /student/pay with the same rails as guest checkout.",
    category: "tuition",
    tags: ["student", "login", "balance", "portal"],
    audience: "tuition",
    sortOrder: 20,
    source: "seed",
  },
  {
    slug: "school-admin-login",
    title: "School admin login",
    summary: "How school administrators access the tuition hub.",
    body:
      "School admins use /school/login (alias for admin login with school=1). Master admin creates org_admin users on active organizations. Programme and fee management live under the school admin dashboard.",
    category: "admin",
    tags: ["school", "admin", "login", "org_admin"],
    audience: "admin",
    sortOrder: 30,
    source: "seed",
  },
  {
    slug: "workspace-registration",
    title: "Register a new school workspace",
    summary: "Self-serve school registration and email verification.",
    body:
      "New schools self-register at /admin/register. After email confirmation, the workspace may activate automatically (programmes and fees cloned from the platform template) or await master approval — see Master Admin school workspace settings. Optional school website URL helps fetch your favicon for /pay/your-slug. School admin login may be auto-generated with a password-set email when that policy is enabled.",
    category: "admin",
    tags: ["register", "workspace", "verification", "master"],
    audience: "admin",
    sortOrder: 40,
    source: "seed",
  },
  {
    slug: "ton-connect-pay",
    title: "Pay with TON Connect",
    summary: "Connect Tonkeeper or Telegram wallet to pay tuition on-chain.",
    body:
      "On the pay flow choose TON. Connect wallet via TonConnect (Tonkeeper, MyTonWallet, Telegram). Confirm amount and destination wallet, then send. Payment confirms when the on-chain transfer matches the pending payment.",
    category: "payments",
    tags: ["ton", "wallet", "tonconnect", "tonkeeper"],
    audience: "tuition",
    sortOrder: 50,
    source: "seed",
  },
  {
    slug: "mobile-money-rails",
    title: "Mobile money payment rails",
    summary: "LivePay, Relworx, and Mbiyo at checkout.",
    body:
      "Uganda LivePay supports MTN/Airtel UGX. Relworx supports East Africa MoMo (UGX/KES/TZS). Mbiyo is available when platform keys are set. Each rail needs master-configured API keys in Deployment environment or server env.",
    category: "payments",
    tags: ["livepay", "relworx", "mbiyo", "momo", "ugx"],
    audience: "tuition",
    sortOrder: 60,
    source: "seed",
  },
  {
    slug: "play-clicker-overview",
    title: "URAPearls Clicker overview",
    summary: "Open the game from the home page.",
    body:
      "From the site home, open Clicker. Earn pearls through taps, tasks, friends referrals, and quizzes. Connect TON wallet for on-chain tasks. Notifications and Learn content are available inside the Play hub.",
    category: "play",
    tags: ["clicker", "game", "pearls", "tasks"],
    audience: "play",
    sortOrder: 70,
    source: "seed",
  },
  {
    slug: "ura-services-links",
    title: "URA and Single Window services",
    summary: "Official tax and trade links inside Services.",
    body:
      "In Clicker, open Services for URA eTax, TIN, EFRIS, customs, and Uganda Electronic Single Window links. This assistant does not provide legal tax advice — use official URA channels for determinations.",
    category: "play",
    tags: ["ura", "tax", "services", "uesw", "efris"],
    audience: "play",
    sortOrder: 80,
    source: "seed",
  },
  {
    slug: "openpay-card-top-up",
    title: "Top up your OpenPayGB virtual card",
    summary: "Add UGX balance via mobile money or TON wallet.",
    body:
      "Sign in at /student/login and open the OpenPayGB card panel on your student home. After your card is active, enter a UGX amount (minimum 1,000).\n\n**Mobile money:** Choose Mobile money, enter your Uganda phone number (and MTN/Airtel network when LivePay is enabled), then tap **Top up via MoMo**. Approve the prompt on your phone — balance updates after LivePay or Relworx confirms.\n\n**TON wallet:** Choose TON wallet, connect Tonkeeper or Telegram wallet, send the quoted TON on-chain, and wait for confirmation.",
    category: "payments",
    tags: ["openpay", "card", "top-up", "ton", "momo", "livepay", "relworx", "student"],
    audience: "tuition",
    sortOrder: 55,
    source: "seed",
  },
  {
    slug: "openpay-card-overview",
    title: "OpenPayGB virtual card",
    summary: "Optional closed-loop card for tuition and top-ups.",
    body:
      "Students opt in from the student dashboard. A one-time TON issue fee activates the card. Use the UGX balance at checkout (**Pay with OpenPayGB card**) or top up via mobile money / TON. School admins see a read-only card summary on the student detail page. Master admin manages card settings and the registry.",
    category: "payments",
    tags: ["openpay", "card", "virtual", "tuition", "checkout"],
    audience: "tuition",
    sortOrder: 54,
    source: "seed",
  },
  {
    slug: "receipts-and-email",
    title: "Receipts and email delivery",
    summary: "View, download, and email payment receipts with dual platform + school branding.",
    body:
      "After a confirmed payment, open the receipt link from checkout or student payment history. Preview and PDF show the ODEL HUB platform logo/support contacts (Master Admin Console) plus your school name, letterhead logo, and contacts (Settings → Receipt letterhead). PDF download: /api/receipts/{paymentId}/pdf. Receipt emails send when Brevo or Resend is configured.",
    category: "tuition",
    tags: ["receipt", "pdf", "email", "brevo", "resend", "letterhead", "branding"],
    audience: "tuition",
    sortOrder: 25,
    source: "seed",
  },
  {
    slug: "admission-number-format",
    title: "Customize student admission numbers",
    summary: "School admins set admission/registration number format under Settings.",
    body:
      "Open /admin/settings#admission-number to set prefix, year token, separators, and sequence digits (example RIV-2026-0042). Until you save a format, Create student shows a Configure admission number format button. Auto-generation uses all students already registered for your school (next sequence after the highest match, or student count when starting). See docs/ADMISSION_NUMBER_FORMAT.md.",
    category: "admin",
    tags: ["admission", "registration", "students", "settings", "school"],
    audience: "admin",
    sortOrder: 36,
    source: "seed",
  },
  {
    slug: "guide-student-schools",
    title: "Guide: students & parents (schools)",
    summary: "Term fees, School Code, admission login, and student card for K–12.",
    body:
      "Full handbook: docs/guides/USER_GUIDE_STUDENT_SCHOOLS.md. Pay with School Code + admission number at /pay. Portal login can use admission number + password. Student identity card with QR is shareable after the school creates the student.",
    category: "tuition",
    tags: ["guide", "student", "schools", "term", "school-code"],
    audience: "tuition",
    sortOrder: 12,
    source: "seed",
  },
  {
    slug: "guide-student-higher",
    title: "Guide: students (higher institutions)",
    summary: "Year/semester tuition portal for universities and tertiary.",
    body:
      "Full handbook: docs/guides/USER_GUIDE_STUDENT_HIGHER.md. Sign in at /student/login, view balance, pay by programme year/semester, OpenPayGB card, and receipts.",
    category: "tuition",
    tags: ["guide", "student", "university", "semester", "higher"],
    audience: "tuition",
    sortOrder: 13,
    source: "seed",
  },
  {
    slug: "guide-admin-schools",
    title: "Guide: school administrators",
    summary: "Sessions, classes, bills, admission format, and receipt letterhead.",
    body:
      "Full handbook: docs/guides/USER_GUIDE_ADMIN_SCHOOLS.md. Configure admission numbers and receipt letterhead under /admin/settings. Create students for auto admission numbers and printable QR cards. Receipts show ODEL HUB + school branding.",
    category: "admin",
    tags: ["guide", "admin", "schools", "bills", "sessions"],
    audience: "admin",
    sortOrder: 14,
    source: "seed",
  },
  {
    slug: "guide-admin-higher",
    title: "Guide: higher institution administrators",
    summary: "Programmes, fees, students, and branding for universities.",
    body:
      "Full handbook: docs/guides/USER_GUIDE_ADMIN_HIGHER.md. Manage programmes and fee schedules, students with auto admission numbers, receipt letterhead, and dual-branded receipts.",
    category: "admin",
    tags: ["guide", "admin", "university", "programmes", "higher"],
    audience: "admin",
    sortOrder: 15,
    source: "seed",
  },
  {
    slug: "programme-fees-admin",
    title: "Manage programmes and fees (school admin)",
    summary: "Configure tuition programmes, years, semesters, and fee lines.",
    body:
      "School admins manage programmes under the tuition hub. Add programme codes, fee schedules per year/semester, installment plans, and CSV import where enabled. Students and guest checkout quote fees from these schedules. Master admin can apply inferred programmes across organizations.",
    category: "admin",
    tags: ["programme", "fees", "school", "admin", "installments"],
    audience: "admin",
    sortOrder: 35,
    source: "seed",
  },
  {
    slug: "master-admin-overview",
    title: "Master admin platform controls",
    summary: "Organizations, deployment env, KB, cards, and platform fees.",
    body:
      "Master admin signs in at /admin/master. Approve school workspaces, manage organizations and org admins, set mobile money providers, OpenPayGB card settings, platform checkout fees, deployment environment variables (with Vercel .env export), knowledge base articles, and copilot bubble image.",
    category: "admin",
    tags: ["master", "deployment", "vercel", "organizations", "settings"],
    audience: "admin",
    sortOrder: 5,
    source: "seed",
  },
  {
    slug: "student-signup-portal",
    title: "Student self-registration",
    summary: "Email verification and portal password for students.",
    body:
      "Students can register at /student/register, verify email from the link, then sign in at /student/login. Existing payers may claim a portal at /student/claim using payment proof. Portal unlocks balance view, OpenPayGB card, and signed-in checkout.",
    category: "tuition",
    tags: ["student", "register", "signup", "claim", "portal"],
    audience: "tuition",
    sortOrder: 22,
    source: "seed",
  },
  {
    slug: "deployment-env-vercel",
    title: "Export environment for Vercel",
    summary: "Download merged secrets for Vercel import.",
    body:
      "In Master Admin → Deployment environment, use **Export for Vercel (.env)**. The file merges dashboard overrides with server process env. Import at Vercel → Project → Settings → Environment Variables. Treat the file as secret — never commit it.",
    category: "platform",
    tags: ["vercel", "env", "deployment", "master", "secrets"],
    audience: "admin",
    sortOrder: 2,
    source: "seed",
  },
  {
    slug: "insufficient-payment-funds",
    title: "Insufficient funds at checkout",
    summary: "What happens when balance is too low for card, mobile money, or TON.",
    body:
      "**OpenPayGB card:** Checkout checks your card balance before debiting. If UGX balance is below the quote, payment is blocked with a message to fund your card first — no charge is made.\n\n**Mobile money (LivePay / Relworx / Mbiyo):** You receive a prompt on your phone. If your MoMo wallet lacks funds, you cannot approve or the provider declines. Checkout shows **Insufficient funds. Top up and continue your payment** with a **Top up mobile money** link to Dex onramp (`/dex/onramp`). The tuition payment stays pending until it expires or you retry with sufficient balance.\n\n**TON wallet:** TonConnect will not send if your wallet balance is too low for the quoted TON amount. Checkout shows the same insufficient-funds message with a **Top up TON** link to `/dex/onramp`. After topping up, use **Continue your payment** on the onramp page to return to checkout.",
    category: "payments",
    tags: ["insufficient", "balance", "momo", "ton", "card", "checkout"],
    audience: "tuition",
    sortOrder: 56,
    source: "seed",
  },
  {
    slug: "opgb-settlement-token",
    title: "What is OPGB (OpenPay Global Token)?",
    summary: "Internal settlement token — Phase 1: 1 OPGB = 1 UGX.",
    body:
      "OPGB is the universal **internal settlement asset** for ODEL HUB and OpenPayGB. Users pay in Mobile Money, TON, or card; the platform books balances in OPGB for accounting, cross-currency display, and Dex flows.\n\n**Phase 1:** 1 OPGB minor unit = 1 UGX on the ledger.\n\n**Where it shows:** student OPGB wallet, OpenPayGB card balance, Dex buy/sell quotes, tuition checkout when spending card balance.\n\nArchitecture detail: docs/OPGB_TOKEN_ECOSYSTEM.md",
    category: "opgb",
    tags: ["opgb", "settlement", "ugx", "wallet", "openpaygb"],
    audience: "dex",
    sortOrder: 10,
    source: "seed",
  },
  {
    slug: "odelpay-vs-openpaygb",
    title: "OdelPay vs OpenPayGB",
    summary: "Three product lines in one platform — tuition, schools, and global wallet/Dex.",
    body:
      "**OdelPay — Higher:** universities and tertiary — `/OdelPayUniversities`, `/pay/{slug}`, semester fees.\n\n**OdelPay — Schools:** primary & secondary — `/OdelPaySchools`, term fees (Term 1–3 UI), `/admin/register?segment=schools`.\n\n**OpenPayGB:** global wallet, virtual card, MoMo/TON rails, Dex Hub — `/opgb`, `/dex`.\n\nAll share one deploy and MongoDB tenants; settlement flows through OPGB where configured. See docs/PAYMENT_SYSTEM_ARCHITECTURE.md.",
    category: "ecosystem",
    tags: ["odelpay", "openpaygb", "product-lines", "architecture"],
    audience: "dex",
    sortOrder: 11,
    source: "seed",
  },
  {
    slug: "dex-buy-sell-convert",
    title: "Dex buy, sell, and convert",
    summary: "Live quotes and hosted flows for fiat ↔ crypto.",
    body:
      "**Buy:** `/dex/buy` — enter UGX spend, preview fee + total + crypto received. API: `GET /api/public/dex/buy-quote`.\n\n**Sell:** `/dex/sell` — enter crypto amount, preview UGX settlement after fee. API: `GET /api/public/dex/sell-quote`.\n\n**Convert:** `/dex/convert` — live FX preview between UGX and TON/USDT.\n\nPartner integrators: `GET /api/partner/v1/dex/quote` with scoped API key.",
    category: "dex",
    tags: ["dex", "buy", "sell", "convert", "quote"],
    audience: "dex",
    sortOrder: 12,
    source: "seed",
  },
  {
    slug: "dex-onramp-offramp",
    title: "Dex onramp and offramp",
    summary: "Top up MoMo/TON and withdraw OPGB or crypto.",
    body:
      "**Onramp:** `/dex/onramp` — fund before checkout when balance is insufficient. Links back to pending tuition payment when started from pay flow.\n\n**Offramp / withdraw:** `/dex/offramp` — queue OPGB or custodial crypto payout (student auth required).\n\n**Student wallet:** `/student/login` → OPGB balance and card top-up.",
    category: "dex",
    tags: ["onramp", "offramp", "withdraw", "momo", "ton"],
    audience: "dex",
    sortOrder: 13,
    source: "seed",
  },
  {
    slug: "opgb-wallet-ledger",
    title: "OPGB wallet & ledger",
    summary: "Custodial balances, card sync, and multi-asset custody.",
    body:
      "Each student with a portal may have an `OpgbWallet` ledger (UGX minor units = OPGB). Card top-ups and tuition debits write immutable ledger lines.\n\n**Crypto custody:** `OpgbAssetBalance` holds TON/USDT/BTC/ETH for Dex features.\n\n**Partner read:** `GET /api/partner/v1/opgb/balances?studentId=…` with `opgb:balance:read` scope.",
    category: "opgb",
    tags: ["wallet", "ledger", "custody", "student"],
    audience: "dex",
    sortOrder: 14,
    source: "seed",
  },
  {
    slug: "riverside-demo-school",
    title: "Riverside Academy demo school",
    summary: "Try term-based school checkout on riverside-demo.",
    body:
      "**Checkout:** `/pay/riverside-demo` — Primary Seven programme, Term 1–3 fee schedule.\n\n**Lobby:** `/OdelPaySchools` lists active school tenants including Riverside when seeded.\n\n**Local seed credentials (after `npm run seed`):**\n- School admin: `school.admin@odelhub.local` → `/admin/login?school=1`\n- School student: `school.student@odelhub.local` → `/student/login` (org slug `riverside-demo`)\n\nUniversity demo student remains on tenant `default` — see LOCAL_DEV_AND_CREDENTIALS.md.",
    category: "schools",
    tags: ["demo", "riverside", "school", "term"],
    audience: "tuition",
    sortOrder: 15,
    source: "seed",
  },
  {
    slug: "platform-terms-of-service",
    title: "Platform Terms of Service",
    summary: "Legal terms for ODEL HUB, OdelPay, OpenPayGB, and Dex.",
    body: "Full text: /policies/terms\n\nCovers acceptance, services, accounts, payments, acceptable use, disclaimers, and updates for the ODEL HUB platform (not the URAPearls Clicker app — see /clicker/terms).",
    category: "policies",
    tags: ["terms", "legal", "platform", "policies"],
    audience: "all",
    sortOrder: 2,
    source: "seed",
  },
  {
    slug: "platform-privacy-policy",
    title: "Platform Privacy Policy",
    summary: "How ODEL HUB handles personal and payment data.",
    body: "Full text: /policies/privacy\n\nCovers collection, use, sharing with PSPs, retention, and your rights. URAPearls Clicker privacy: /clicker/privacy.",
    category: "policies",
    tags: ["privacy", "data", "platform", "policies"],
    audience: "all",
    sortOrder: 3,
    source: "seed",
  },
  {
    slug: "platform-risk-disclosure",
    title: "Risk Disclosure",
    summary: "Risks for MoMo, TON, OPGB, and Dex features.",
    body: "Full text: /policies/risk-disclosure\n\nRead before using crypto quotes, Dex intents, or on-chain tuition payment.",
    category: "policies",
    tags: ["risk", "dex", "opgb", "ton", "policies"],
    audience: "all",
    sortOrder: 4,
    source: "seed",
  },
  {
    slug: "platform-payment-provider-policy",
    title: "Payment Provider Policy",
    summary: "How third-party payment rails are enabled and shown at checkout.",
    body: "Full text: /policies/payment-providers\n\nLists Mbiyo, LivePay, Relworx, VixonPay, TON, and platform card rails. Master Admin toggles availability.",
    category: "policies",
    tags: ["payments", "psp", "providers", "policies"],
    audience: "all",
    sortOrder: 5,
    source: "seed",
  },
  {
    slug: "integrate-odel-hub",
    title: "Integrate with ODEL HUB",
    summary: "Self-serve developer registration, Partner API, and OPGB/Dex surfaces.",
    body:
      "Third-party apps join the ODEL HUB ecosystem autonomously:\n\n1. **Register** — `POST /api/public/ecosystem/register-app` or `/developers/register` UI. You receive `clientId` + `clientSecret`.\n2. **Dashboard** — Sign in at `/developers/dashboard` to create **Partner API keys** and **webhook endpoints**.\n3. **Tuition / SIS** — See `docs/SIS_INTEGRATION_COOKBOOK.md` and `docs/PARTNER_API.md` for checkout + `payment.confirmed` webhooks.\n4. **OPGB / Dex** — Scoped keys: `dex:quote:read`, `dex:intent:create`, `opgb:balance:read`. Endpoints under `/api/partner/v1/dex/*` and `/api/partner/v1/opgb/balances`.\n5. **OAuth** — Authorization code + client credentials at `/api/oauth/authorize` and `/api/oauth/token`.\n6. **Branded OPGB app** — Set `brandingName` and `redirectUris` at registration; use payment intents to deep-link users into `/dex/buy` flows.",
    category: "developers",
    tags: ["integrate", "partner", "oauth", "developers", "ecosystem"],
    audience: "dex",
    sortOrder: 5,
    source: "seed",
  },
  {
    slug: "partner-api-overview",
    title: "Partner API overview",
    summary: "Machine-to-machine payments read API and outbound webhooks.",
    body:
      "Authenticate with `Authorization: Bearer odelhub_live_…`.\n\n**Read payments:** `GET /api/partner/v1/payments` and `GET /api/partner/v1/payments/:id`.\n\n**Organizations:** `GET /api/partner/v1/organizations`.\n\n**Webhooks:** Configure HTTPS endpoints in the developer dashboard. Verify `X-Odelhub-Signature` (HMAC-SHA256). Events include `payment.confirmed`, `payment.failed`, `dex.intent.created`, `dex.intent.completed`.\n\nMaster admins can still issue platform-wide keys from `/admin/master#partner-integrations`.",
    category: "developers",
    tags: ["partner", "api", "webhook", "payments"],
    audience: "dex",
    sortOrder: 6,
    source: "seed",
  },
  {
    slug: "opgb-dex-partner-api",
    title: "OPGB & Dex partner API",
    summary: "Quotes, payment intents, and OPGB balance reads for integrators.",
    body:
      "**Quotes (read):** `GET /api/partner/v1/dex/quote?side=buy&crypto=TON&fiatAmountUgx=100000` or `side=sell&cryptoAmount=1.5`.\n\n**Payment intents (write):** `POST /api/partner/v1/dex/payment-intents` with `{ type, crypto, fiatAmountUgx?, cryptoAmount?, studentId?, redirectUrl? }`. Returns `executeUrl` for hosted Dex UI.\n\n**OPGB balances:** `GET /api/partner/v1/opgb/balances?studentId=…` (requires `opgb:balance:read`).\n\nScopes are granted per developer app at registration; API keys cannot exceed app scopes.",
    category: "dex",
    tags: ["opgb", "dex", "partner", "quote", "intent"],
    audience: "dex",
    sortOrder: 7,
    source: "seed",
  },
  {
    slug: "oauth-app-registry",
    title: "OAuth app registry for branded OPGB apps",
    summary: "Client credentials and authorization code flows for third-party apps.",
    body:
      "Each registered app has a public `clientId`, secret `clientSecret`, and allowed `redirectUris`.\n\n**Client credentials:** `POST /api/oauth/token` with `grant_type=client_credentials` returns a short-lived Partner API access token.\n\n**Authorization code:** Redirect users to `/api/oauth/authorize?response_type=code&client_id=…&redirect_uri=…&scope=…&state=…` (app owner must be signed in to the developer dashboard). Exchange the code at `/api/oauth/token` with `grant_type=authorization_code`.\n\nUse returned tokens as `Authorization: Bearer odelhub_live_…` on Partner APIs.",
    category: "developers",
    tags: ["oauth", "branded", "opgb", "client"],
    audience: "dex",
    sortOrder: 8,
    source: "seed",
  },
  {
    slug: "platform-help-copilot",
    title: "How ODEL HUB Copilot works",
    summary: "ODEL HUB Copilot answers from help articles with direct links.",
    body:
      "ODEL HUB Copilot answers from platform help articles (editable in Master Admin) and includes clickable links to tuition pay, school registration, student portal, and URAPearls. For account-specific help, use Talk to an agent in the chat.",
    category: "platform",
    tags: ["help", "copilot", "knowledge", "support"],
    audience: "all",
    sortOrder: 1,
    source: "seed",
  },
];

function learnDefaultsToSeed(): KnowledgeSeedArticle[] {
  const out: KnowledgeSeedArticle[] = [];
  for (const cat of LEARN_CATEGORY_DEFAULTS) {
    const slug = `learn-${cat.slug}`;
    const lessonText = cat.lessons.map((l) => `### ${l.title}\n${l.content}`).join("\n\n");
    out.push({
      slug,
      title: cat.title,
      summary: cat.summary,
      body: `${cat.summary}\n\n${lessonText}`,
      category: "tax-education",
      tags: ["learn", ...cat.topics.slice(0, 8)],
      audience: "play",
      sortOrder: 100 + (cat.sortOrder ?? 0),
      source: "learn-import",
    });
  }
  return out;
}

async function upsertSeedArticles(articles: KnowledgeSeedArticle[], respectManual = false): Promise<number> {
  let n = 0;
  for (const article of articles) {
    if (respectManual) {
      const existing = await prisma.knowledgeArticle.findUnique({
        where: { slug: article.slug },
        select: { source: true },
      });
      if (existing?.source === "manual") continue;
    }

    await prisma.knowledgeArticle.upsert({
      where: { slug: article.slug },
      create: {
        slug: article.slug,
        title: article.title,
        summary: article.summary,
        body: article.body,
        category: article.category,
        tags: article.tags,
        audience: article.audience,
        sortOrder: article.sortOrder,
        source: article.source,
        published: true,
      },
      update: {
        title: article.title,
        summary: article.summary,
        body: article.body,
        category: article.category,
        tags: article.tags,
        audience: article.audience,
        sortOrder: article.sortOrder,
        source: article.source,
        published: true,
      },
    });
    n += 1;
  }
  return n;
}

/** Continuous sync: push code seed updates without wiping manual articles. */
export async function syncKnowledgeSeedUpdates(): Promise<{ synced: number }> {
  const all = [...PLATFORM_KB_SEED, ...learnDefaultsToSeed()];
  const synced = await upsertSeedArticles(all, true);
  return { synced };
}

export async function reimportKnowledgeSeed(): Promise<{ seeded: number }> {
  await prisma.knowledgeArticle.deleteMany({
    where: { source: { in: ["seed", "learn-import"] } },
  });
  const all = [...PLATFORM_KB_SEED, ...learnDefaultsToSeed()];
  const seeded = await upsertSeedArticles(all);
  return { seeded };
}

export async function ensureKnowledgeBaseSeeded(): Promise<{ seeded: number; synced: number }> {
  const count = await prisma.knowledgeArticle.count();
  const all = [...PLATFORM_KB_SEED, ...learnDefaultsToSeed()];

  if (count === 0) {
    const seeded = await upsertSeedArticles(all);
    return { seeded, synced: 0 };
  }

  const { synced } = await syncKnowledgeSeedUpdates();
  return { seeded: 0, synced };
}
