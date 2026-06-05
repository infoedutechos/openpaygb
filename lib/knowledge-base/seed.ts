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

async function upsertSeedArticles(articles: KnowledgeSeedArticle[]): Promise<number> {
  let n = 0;
  for (const article of articles) {
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

export async function reimportKnowledgeSeed(): Promise<{ seeded: number }> {
  await prisma.knowledgeArticle.deleteMany({
    where: { source: { in: ["seed", "learn-import"] } },
  });
  const all = [...PLATFORM_KB_SEED, ...learnDefaultsToSeed()];
  const seeded = await upsertSeedArticles(all);
  return { seeded };
}

export async function ensureKnowledgeBaseSeeded(): Promise<{ seeded: number }> {
  const count = await prisma.knowledgeArticle.count();
  if (count > 0) return { seeded: 0 };

  const all = [...PLATFORM_KB_SEED, ...learnDefaultsToSeed()];
  const seeded = await upsertSeedArticles(all);
  return { seeded };
}
