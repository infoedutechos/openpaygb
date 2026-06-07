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
      "New schools register at /admin/register. After submit, verify email from the link sent by Resend. Workspace stays pending until master approves (when that policy is enabled). Then master provisions org_admin login.",
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
    summary: "View, download, and email payment receipts.",
    body:
      "After a confirmed payment, open the receipt link from checkout or student payment history. PDF download is at /api/receipts/{paymentId}/pdf. Receipt emails send when Brevo or Resend is configured in Deployment environment (TRANSACTIONAL_EMAIL_FROM + BREVO_API_KEY or RESEND_API_KEY).",
    category: "tuition",
    tags: ["receipt", "pdf", "email", "brevo", "resend"],
    audience: "tuition",
    sortOrder: 25,
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
    slug: "platform-help-copilot",
    title: "How this help assistant works",
    summary: "Knowledge-base copilot without paid AI APIs.",
    body:
      "Answers are retrieved from the ODEL HUB knowledge base (articles you can extend in Master Admin). No OpenAI or external LLM is required. If nothing matches, basic rules apply — use Talk to an agent for human help.",
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
