import type { PlatformAudience } from "@prisma/client";

export type KnowledgeArticleRecord = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  body: string;
  category: string;
  tags: string[];
  audience: PlatformAudience;
  published: boolean;
  sortOrder: number;
  source: string;
};

export type KnowledgeSearchHit = KnowledgeArticleRecord & {
  score: number;
  excerpt: string;
};

export type PlatformHub = "all" | "tuition" | "play" | "admin" | "dex";

export function hubToAudiences(hub: PlatformHub): PlatformAudience[] {
  if (hub === "all") return ["all", "tuition", "play", "admin", "dex"];
  if (hub === "dex") return ["all", "dex", "tuition"];
  return ["all", hub];
}
