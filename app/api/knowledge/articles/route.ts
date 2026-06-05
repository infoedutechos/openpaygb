import { NextResponse } from "next/server";
import { clientIp, rateLimitHit } from "@/lib/rate-limit";
import { apiErrorResponse } from "@/lib/api-error";
import { listPublishedKnowledgeArticles } from "@/lib/knowledge-base/browse";
import { ensureKnowledgeBaseSeeded } from "@/lib/knowledge-base/seed";
import type { PlatformHub } from "@/lib/knowledge-base/types";

export async function GET(req: Request) {
  try {
    if (rateLimitHit(`kb-articles:${clientIp(req)}`, 120, 60_000)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    await ensureKnowledgeBaseSeeded();

    const url = new URL(req.url);
    const hub = (url.searchParams.get("hub") ?? "all") as PlatformHub;
    const category = url.searchParams.get("category")?.trim() || undefined;
    const limit = Math.min(Number(url.searchParams.get("limit") ?? "200"), 200);

    const articles = await listPublishedKnowledgeArticles({ hub, category, limit });
    const categories = [...new Set(articles.map((a) => a.category))].sort();

    return NextResponse.json({ hub, categories, articles });
  } catch (e) {
    return apiErrorResponse(e, { route: "GET /api/knowledge/articles" });
  }
}
