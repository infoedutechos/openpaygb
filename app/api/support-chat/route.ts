import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { clientIp, rateLimitHit } from "@/lib/rate-limit";
import { composeCopilotReply } from "@/lib/knowledge-base/copilot-reply";
import { ensureKnowledgeBaseSeeded } from "@/lib/knowledge-base/seed";

import { apiErrorResponse } from "@/lib/api-error";
export const dynamic = "force-dynamic";

const MessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().max(4000),
});

const BodySchema = z.object({
  messages: z.array(MessageSchema).max(24),
  hub: z.enum(["all", "tuition", "play", "admin"]).optional(),
});

/** Legacy Clicker endpoint — KB copilot only (no OpenAI). */
export async function POST(req: NextRequest) {
  try {
  if (rateLimitHit(`support-chat:${clientIp(req)}`, 30, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { messages, hub = "play" } = parsed.data;
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  const lastUserText = lastUser?.content?.trim() ?? "";

  await ensureKnowledgeBaseSeeded();
  const copilot = await composeCopilotReply(lastUserText, hub);

  return NextResponse.json({
    reply: copilot.reply,
    source: copilot.source,
    citations: copilot.citations,
  });

  } catch (e) {
    return apiErrorResponse(e, { route: "support-chat/post", fallback: "Request failed" });
  }
}
