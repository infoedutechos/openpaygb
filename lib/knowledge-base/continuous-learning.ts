import "server-only";

import { prisma } from "@/lib/prisma";
import { normalizeLearningQuery } from "@/lib/knowledge-base/normalize-query";
import type { PlatformHub } from "@/lib/knowledge-base/types";

export { normalizeLearningQuery };

/** Record a copilot fallback — aggregates repeated unanswered questions. */
export async function recordKnowledgeLearningGap(opts: {
  query: string;
  hub: PlatformHub;
}): Promise<void> {
  const queryNorm = normalizeLearningQuery(opts.query);
  if (queryNorm.length < 8) return;

  const now = new Date();
  await prisma.knowledgeLearningGap.upsert({
    where: { queryNorm },
    create: {
      queryNorm,
      querySample: opts.query.trim().slice(0, 500),
      hub: opts.hub,
      hitCount: 1,
      status: "pending",
      firstSeenAt: now,
      lastSeenAt: now,
    },
    update: {
      querySample: opts.query.trim().slice(0, 500),
      hub: opts.hub,
      hitCount: { increment: 1 },
      lastSeenAt: now,
      status: "pending",
    },
  });
}

export async function listPendingKnowledgeGaps(limit = 30) {
  return prisma.knowledgeLearningGap.findMany({
    where: { status: "pending" },
    orderBy: [{ hitCount: "desc" }, { lastSeenAt: "desc" }],
    take: limit,
  });
}
