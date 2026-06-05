import type { PlatformAudience } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { withPrismaRetry } from "@/lib/prisma-retry";
import { excerptFromBody } from "@/lib/knowledge-base/tokenize";
import type { PlatformHub } from "@/lib/knowledge-base/types";
import { hubToAudiences } from "@/lib/knowledge-base/types";

export type KnowledgeBrowseCard = {
  slug: string;
  title: string;
  summary: string;
  excerpt: string;
  category: string;
  tags: string[];
  audience: PlatformAudience;
  sortOrder: number;
  updatedAt: string;
};

export type KnowledgeArticlePublic = KnowledgeBrowseCard & {
  body: string;
};

export async function listPublishedKnowledgeArticles(opts?: {
  hub?: PlatformHub;
  category?: string;
  limit?: number;
}): Promise<KnowledgeBrowseCard[]> {
  const audiences = hubToAudiences(opts?.hub ?? "all");
  const rows = await withPrismaRetry(() =>
    prisma.knowledgeArticle.findMany({
      where: {
        published: true,
        audience: { in: audiences },
        ...(opts?.category ? { category: opts.category } : {}),
      },
      orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
      take: opts?.limit ?? 200,
      select: {
        slug: true,
        title: true,
        summary: true,
        body: true,
        category: true,
        tags: true,
        audience: true,
        sortOrder: true,
        updatedAt: true,
      },
    }),
  );

  return rows.map((r) => ({
    slug: r.slug,
    title: r.title,
    summary: r.summary,
    excerpt: excerptFromBody(r.summary || r.body, 200),
    category: r.category,
    tags: r.tags,
    audience: r.audience,
    sortOrder: r.sortOrder,
    updatedAt: r.updatedAt.toISOString(),
  }));
}

export async function getPublishedKnowledgeArticle(
  slug: string,
): Promise<KnowledgeArticlePublic | null> {
  const row = await withPrismaRetry(() =>
    prisma.knowledgeArticle.findFirst({
      where: { slug, published: true },
      select: {
        slug: true,
        title: true,
        summary: true,
        body: true,
        category: true,
        tags: true,
        audience: true,
        sortOrder: true,
        updatedAt: true,
      },
    }),
  );
  if (!row) return null;
  return {
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    excerpt: excerptFromBody(row.summary || row.body, 200),
    body: row.body,
    category: row.category,
    tags: row.tags,
    audience: row.audience,
    sortOrder: row.sortOrder,
    updatedAt: row.updatedAt.toISOString(),
  };
}
