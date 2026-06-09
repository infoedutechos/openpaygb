import { autonomousLearnFromGap } from "@/lib/knowledge-base/autonomous-learning";
import { formatArticleLink } from "@/lib/knowledge-base/article-paths";
import { searchKnowledgeBase, searchKnowledgeBaseRelaxed } from "@/lib/knowledge-base/search";
import type { PlatformHub } from "@/lib/knowledge-base/types";
import { buildCopilotIntro, getCopilotAssistantContext } from "@/lib/copilot-assistant-context";
import { getSupportChatFallbackReply } from "@/utils/support-chat-fallback";

export type CopilotReply = {
  reply: string;
  citations: string[];
  source: "knowledge_base" | "fallback";
};

function stripApiDisclaimers(text: string): string {
  return text
    .replace(/no external ai api/gi, "")
    .replace(/zero-?api-?cost/gi, "")
    .replace(/knowledge base —/gi, "")
    .replace(/answers come from our knowledge base[^.]*\.?/gi, "")
    .trim();
}

function formatKbReply(
  userMessage: string,
  hits: Awaited<ReturnType<typeof searchKnowledgeBase>>,
): CopilotReply | null {
  if (!hits.length) return null;

  const lines: string[] = [];

  if (hits.length === 1) {
    const top = hits[0];
    lines.push(formatArticleLink(top.title, top.slug));
    const detail = top.summary?.trim() || top.excerpt?.trim();
    if (detail) lines.push(detail);
  } else {
    for (const hit of hits.slice(0, 3)) {
      const detail = hit.summary?.trim() || hit.excerpt?.trim();
      lines.push(`• ${formatArticleLink(hit.title, hit.slug)}${detail ? ` — ${detail}` : ""}`);
    }
  }

  const citations = hits.slice(0, 3).map((h) => h.slug);

  const agentHint =
    /\b(agent|human|person|support|operator|representative|call|phone)\b/i.test(userMessage)
      ? "\n\nFor account-specific help, use **Talk to an agent** in this chat."
      : "";

  return {
    reply: stripApiDisclaimers(`${lines.join("\n\n")}${agentHint}`),
    citations,
    source: "knowledge_base",
  };
}

/** Platform copilot: keyword search over KnowledgeArticle + rule fallback. */
export async function composeCopilotReply(
  userMessage: string,
  hub: PlatformHub = "all",
): Promise<CopilotReply> {
  const ctx = await getCopilotAssistantContext();
  const trimmed = userMessage.trim();

  if (!trimmed) {
    return {
      reply: buildCopilotIntro(ctx),
      citations: [],
      source: "knowledge_base",
    };
  }

  const hits = await searchKnowledgeBase({ query: trimmed, hub, limit: 4 });
  const kb = formatKbReply(trimmed, hits);
  if (kb) return kb;

  const relaxed = await searchKnowledgeBaseRelaxed({ query: trimmed, hub, limit: 4 });
  const relaxedKb = formatKbReply(trimmed, relaxed);
  if (relaxedKb) return relaxedKb;

  const learned = await autonomousLearnFromGap({ query: trimmed, hub });
  if (learned) {
    return { ...learned, reply: stripApiDisclaimers(learned.reply) };
  }

  const fallback = getSupportChatFallbackReply(trimmed).replace(/URAPearls/g, ctx.platformName);
  return {
    reply: stripApiDisclaimers(fallback),
    citations: [],
    source: "fallback",
  };
}

/** Typeahead suggestions while the user types. */
export async function suggestCopilotQueries(
  partial: string,
  hub: PlatformHub = "all",
): Promise<string[]> {
  const q = partial.trim();
  if (q.length < 2) return [];

  const hits = await searchKnowledgeBase({ query: q, hub, limit: 5 });
  const titles = hits.map((h) => h.title);
  const unique = [...new Set(titles)];
  return unique.slice(0, 4);
}
