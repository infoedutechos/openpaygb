import { NextResponse } from "next/server";
import { clientIp, rateLimitHit } from "@/lib/rate-limit";
import { apiErrorResponse } from "@/lib/api-error";
import { ensureKnowledgeBaseSeeded } from "@/lib/knowledge-base/seed";
import { searchKnowledgeBase } from "@/lib/knowledge-base/search";
import type { PlatformHub } from "@/lib/knowledge-base/types";

export async function GET(req: Request) {
  try {
    if (rateLimitHit(`kb-search:${clientIp(req)}`, 90, 60_000)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    await ensureKnowledgeBaseSeeded();

    const url = new URL(req.url);
    const q = url.searchParams.get("q")?.trim() ?? "";
    const hub = (url.searchParams.get("hub") ?? "all") as PlatformHub;
    const limit = Math.min(Number(url.searchParams.get("limit") ?? "8"), 20);

    const hits = await searchKnowledgeBase({ query: q, hub, limit });

    return NextResponse.json({
      query: q,
      hub,
      hits: hits.map((h) => ({
        slug: h.slug,
        title: h.title,
        summary: h.summary,
        excerpt: h.excerpt,
        category: h.category,
        tags: h.tags,
        score: h.score,
      })),
    });
  } catch (e) {
    return apiErrorResponse(e, { route: "GET /api/knowledge/search" });
  }
}
