import type { KnowledgeArticle } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { withPrismaRetry } from "@/lib/prisma-retry";
import { excerptFromBody, tokenizeQuery } from "@/lib/knowledge-base/tokenize";
import type { KnowledgeSearchHit, PlatformHub } from "@/lib/knowledge-base/types";
import { hubToAudiences } from "@/lib/knowledge-base/types";

function scoreArticle(
  tokens: string[],
  article: Pick<KnowledgeArticle, "title" | "summary" | "body" | "tags" | "category">,
): number {
  if (!tokens.length) return 0;
  const title = article.title.toLowerCase();
  const summary = article.summary.toLowerCase();
  const body = article.body.toLowerCase();
  const tags = article.tags.map((t) => t.toLowerCase());
  const category = article.category.toLowerCase();
  let score = 0;

  for (const token of tokens) {
    if (title.includes(token)) score += 12;
    if (category.includes(token)) score += 6;
    if (tags.some((t) => t.includes(token))) score += 5;
    if (summary.includes(token)) score += 4;
    const bodyMatches = body.split(token).length - 1;
    score += Math.min(bodyMatches, 8);
  }
  return score;
}

export async function searchKnowledgeBase(opts: {
  query: string;
  hub?: PlatformHub;
  limit?: number;
}): Promise<KnowledgeSearchHit[]> {
  const tokens = tokenizeQuery(opts.query);
  const audiences = hubToAudiences(opts.hub ?? "all");
  const rows = await withPrismaRetry(() =>
    prisma.knowledgeArticle.findMany({
      where: { published: true, audience: { in: audiences } },
      orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
    }),
  );

  const hits: KnowledgeSearchHit[] = [];
  for (const row of rows) {
    const score = scoreArticle(tokens, row);
    if (score <= 0 && tokens.length > 0) continue;
    hits.push({
      id: row.id,
      slug: row.slug,
      title: row.title,
      summary: row.summary,
      body: row.body,
      category: row.category,
      tags: row.tags,
      audience: row.audience,
      published: row.published,
      sortOrder: row.sortOrder,
      source: row.source,
      score: score || row.sortOrder,
      excerpt: excerptFromBody(row.summary || row.body),
    });
  }

  hits.sort((a, b) => b.score - a.score || a.sortOrder - b.sortOrder);
  const limit = opts.limit ?? 5;
  return tokens.length === 0 ? hits.slice(0, limit) : hits.filter((h) => h.score > 0).slice(0, limit);
}
