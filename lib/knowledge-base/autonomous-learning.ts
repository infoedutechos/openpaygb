import "server-only";

import { createHash } from "node:crypto";
import type { PlatformAudience } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { withPrismaRetry } from "@/lib/prisma-retry";
import { normalizeLearningQuery } from "@/lib/knowledge-base/normalize-query";
import { searchKnowledgeBaseRelaxed } from "@/lib/knowledge-base/search";
import { excerptFromBody } from "@/lib/knowledge-base/tokenize";
import type { CopilotReply } from "@/lib/knowledge-base/copilot-reply";
import type { KnowledgeSearchHit, PlatformHub } from "@/lib/knowledge-base/types";

export function slugFromLearningQuery(queryNorm: string): string {
  const base = queryNorm
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .slice(0, 40);
  const hash = createHash("sha256").update(queryNorm).digest("hex").slice(0, 6);
  const slug = `auto-${base || "learned"}-${hash}`.replace(/-+/g, "-").replace(/^-|-$/g, "");
  return slug.slice(0, 80);
}

function hubAudience(hub: PlatformHub): PlatformAudience {
  if (hub === "tuition" || hub === "play" || hub === "admin" || hub === "dex") return hub;
  return "all";
}

function hubCategory(hub: PlatformHub): string {
  if (hub === "admin") return "admin";
  if (hub === "play") return "play";
  if (hub === "tuition") return "tuition";
  if (hub === "dex") return "dex";
  return "general";
}

/** Build article fields from the user question and any related KB hits (no paid AI). */
export function buildAutoLearnedArticle(opts: {
  query: string;
  hub: PlatformHub;
  related: KnowledgeSearchHit[];
}): { title: string; summary: string; body: string; tags: string[] } {
  const title =
    opts.query.length > 120 ? `${opts.query.slice(0, 117).trim()}…` : opts.query.trim();

  if (opts.related.length > 0) {
    const sections = opts.related.slice(0, 3).map(
      (h) =>
        `### ${h.title}\n${h.excerpt}\n\n_See also: \`${h.slug}\`_`,
    );
    const body = [
      "## Your question",
      opts.query.trim(),
      "",
      "## Auto-learned answer",
      "This answer was assembled automatically from related ODELPay HUB help articles.",
      "",
      ...sections,
      "",
      "## Need more help?",
      "Use **Talk to an agent** in the chat for account-specific issues.",
    ].join("\n");
    return {
      title,
      summary: excerptFromBody(opts.related[0].summary || opts.related[0].excerpt, 400),
      body,
      tags: ["auto-learned", "copilot-gap", ...opts.related.slice(0, 3).map((h) => h.slug)],
    };
  }

  const body = [
    "## Your question",
    opts.query.trim(),
    "",
    "## Auto-learned answer",
    "We did not have an exact article for this yet. This entry was **auto-learned** from your question and will improve as the knowledge base grows.",
    "",
    "Try asking about **tuition payments**, **virtual cards**, **school admin**, **receipts**, or **URAPearls**.",
    "",
    "For account-specific help, use **Talk to an agent**.",
  ].join("\n");

  return {
    title,
    summary: "Auto-learned from your question — refine anytime in Master Admin → Knowledge base.",
    body,
    tags: ["auto-learned", "copilot-gap", "needs-review"],
  };
}

function replyFromArticle(
  article: { title: string; summary: string; body: string; slug: string },
  userMessage: string,
): CopilotReply {
  const lines = [`**${article.title}**`, article.summary || excerptFromBody(article.body)];
  const agentHint =
    /\b(agent|human|person|support|operator|representative|call|phone)\b/i.test(userMessage)
      ? "\n\nFor account-specific help, use **Talk to an agent** in this chat."
      : "\n\nNeed a person? Tap **Talk to an agent** anytime.";

  return {
    reply: `${lines.join("\n\n")}${agentHint}`,
    citations: [article.slug],
    source: "knowledge_base",
  };
}

/**
 * On copilot miss: record gap, publish an auto-learned article, return KB reply.
 * Fully autonomous — no master approval step.
 */
export async function autonomousLearnFromGap(opts: {
  query: string;
  hub: PlatformHub;
}): Promise<CopilotReply | null> {
  const trimmed = opts.query.trim();
  const queryNorm = normalizeLearningQuery(trimmed);
  if (queryNorm.length < 8) return null;

  const slug = slugFromLearningQuery(queryNorm);
  const now = new Date();

  const existing = await withPrismaRetry(() =>
    prisma.knowledgeArticle.findUnique({ where: { slug } }),
  );
  if (existing?.published) {
    await withPrismaRetry(() =>
      prisma.knowledgeLearningGap.upsert({
        where: { queryNorm },
        create: {
          queryNorm,
          querySample: trimmed.slice(0, 500),
          hub: opts.hub,
          hitCount: 1,
          status: "promoted",
          promotedSlug: slug,
          firstSeenAt: now,
          lastSeenAt: now,
        },
        update: {
          querySample: trimmed.slice(0, 500),
          hub: opts.hub,
          hitCount: { increment: 1 },
          lastSeenAt: now,
          status: "promoted",
          promotedSlug: slug,
        },
      }),
    );
    return replyFromArticle(existing, trimmed);
  }

  const related = await searchKnowledgeBaseRelaxed({
    query: trimmed,
    hub: opts.hub,
    limit: 5,
  });
  const draft = buildAutoLearnedArticle({
    query: trimmed,
    hub: opts.hub,
    related,
  });

  const article = await withPrismaRetry(() =>
    prisma.knowledgeArticle.upsert({
      where: { slug },
      create: {
        slug,
        title: draft.title,
        summary: draft.summary,
        body: draft.body,
        category: hubCategory(opts.hub),
        tags: draft.tags,
        audience: hubAudience(opts.hub),
        published: true,
        sortOrder: 9000,
        source: "auto-learned",
      },
      update: {
        title: draft.title,
        summary: draft.summary,
        body: draft.body,
        tags: draft.tags,
        published: true,
        source: "auto-learned",
      },
    }),
  );

  await withPrismaRetry(() =>
    prisma.knowledgeLearningGap.upsert({
      where: { queryNorm },
      create: {
        queryNorm,
        querySample: trimmed.slice(0, 500),
        hub: opts.hub,
        hitCount: 1,
        status: "promoted",
        promotedSlug: slug,
        firstSeenAt: now,
        lastSeenAt: now,
      },
      update: {
        querySample: trimmed.slice(0, 500),
        hub: opts.hub,
        hitCount: { increment: 1 },
        lastSeenAt: now,
        status: "promoted",
        promotedSlug: slug,
      },
    }),
  );

  return replyFromArticle(article, trimmed);
}
