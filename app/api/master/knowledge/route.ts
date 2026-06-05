import { NextResponse } from "next/server";
import { z } from "zod";
import { PlatformAudience } from "@prisma/client";
import { requireMaster } from "@/lib/master-session";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse } from "@/lib/api-error";
import { ensureKnowledgeBaseSeeded, reimportKnowledgeSeed } from "@/lib/knowledge-base/seed";

const ArticleBody = z.object({
  slug: z.string().min(2).max(80).regex(/^[a-z0-9-]+$/),
  title: z.string().min(2).max(200),
  summary: z.string().max(500).optional(),
  body: z.string().min(10).max(50_000),
  category: z.string().max(80).optional(),
  tags: z.array(z.string().max(40)).max(20).optional(),
  audience: z.enum(["all", "tuition", "play", "admin"]).optional(),
  published: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

const PatchBody = z.object({
  id: z.string().optional(),
  slug: z.string().optional(),
  delete: z.boolean().optional(),
  article: ArticleBody.partial().optional(),
  reseed: z.boolean().optional(),
});

export async function GET() {
  try {
    const gate = await requireMaster();
    if (!gate.ok) return gate.response;

    await ensureKnowledgeBaseSeeded();

    const articles = await prisma.knowledgeArticle.findMany({
      orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
    });

    return NextResponse.json({
      total: articles.length,
      articles: articles.map((a) => ({
        id: a.id,
        slug: a.slug,
        title: a.title,
        summary: a.summary,
        category: a.category,
        tags: a.tags,
        audience: a.audience,
        published: a.published,
        sortOrder: a.sortOrder,
        source: a.source,
        updatedAt: a.updatedAt.toISOString(),
      })),
    });
  } catch (e) {
    return apiErrorResponse(e, { route: "GET /api/master/knowledge" });
  }
}

export async function PATCH(req: Request) {
  try {
    const gate = await requireMaster();
    if (!gate.ok) return gate.response;

    const json = await req.json().catch(() => null);
    const parsed = PatchBody.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid body", details: parsed.error.flatten() }, { status: 400 });
    }

    if (parsed.data.reseed) {
      const result = await reimportKnowledgeSeed();
      return NextResponse.json({ ok: true, reseeded: result.seeded });
    }

    if (parsed.data.delete) {
      const where = parsed.data.id
        ? { id: parsed.data.id }
        : parsed.data.slug
          ? { slug: parsed.data.slug }
          : null;
      if (!where) return NextResponse.json({ error: "id or slug required" }, { status: 400 });
      await prisma.knowledgeArticle.deleteMany({ where });
      return NextResponse.json({ ok: true, deleted: true });
    }

    const article = parsed.data.article;
    if (!article?.slug || !article.title || !article.body) {
      return NextResponse.json({ error: "article.slug, title, body required" }, { status: 400 });
    }

    const saved = await prisma.knowledgeArticle.upsert({
      where: { slug: article.slug },
      create: {
        slug: article.slug,
        title: article.title,
        summary: article.summary ?? "",
        body: article.body,
        category: article.category ?? "general",
        tags: article.tags ?? [],
        audience: (article.audience ?? "all") as PlatformAudience,
        published: article.published ?? true,
        sortOrder: article.sortOrder ?? 0,
        source: "manual",
      },
      update: {
        title: article.title,
        summary: article.summary,
        body: article.body,
        category: article.category,
        tags: article.tags,
        audience: article.audience as PlatformAudience | undefined,
        published: article.published,
        sortOrder: article.sortOrder,
      },
    });

    return NextResponse.json({ ok: true, article: { id: saved.id, slug: saved.slug } });
  } catch (e) {
    return apiErrorResponse(e, { route: "PATCH /api/master/knowledge" });
  }
}
