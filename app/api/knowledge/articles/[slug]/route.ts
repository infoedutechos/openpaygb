import { NextResponse } from "next/server";
import { clientIp, rateLimitHit } from "@/lib/rate-limit";
import { apiErrorResponse } from "@/lib/api-error";
import { getPublishedKnowledgeArticle } from "@/lib/knowledge-base/browse";
import { ensureKnowledgeBaseSeeded } from "@/lib/knowledge-base/seed";

type Params = { params: Promise<{ slug: string }> };

export async function GET(req: Request, { params }: Params) {
  try {
    if (rateLimitHit(`kb-article:${clientIp(req)}`, 120, 60_000)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    await ensureKnowledgeBaseSeeded();

    const { slug } = await params;
    const article = await getPublishedKnowledgeArticle(slug.trim());
    if (!article) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ article });
  } catch (e) {
    return apiErrorResponse(e, { route: "GET /api/knowledge/articles/[slug]" });
  }
}
