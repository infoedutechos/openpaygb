import { NextResponse } from "next/server";
import { z } from "zod";
import { clientIp, rateLimitHit } from "@/lib/rate-limit";
import { apiErrorResponse } from "@/lib/api-error";
import { appendChatTurn, getOrCreateConversation } from "@/lib/platform-chat";
import type { PlatformHub } from "@/lib/knowledge-base/types";
import { PLATFORM_CHAT_COOKIE } from "@/lib/platform-reader-key";
import { cookies } from "next/headers";
import { randomUUID } from "node:crypto";

const PostBody = z.object({
  message: z.string().min(1).max(4000),
  hub: z.enum(["all", "tuition", "play", "admin"]).optional(),
  conversationId: z.string().optional(),
});

function resolveHub(url: URL, bodyHub?: PlatformHub): PlatformHub {
  const q = url.searchParams.get("hub");
  if (q === "tuition" || q === "play" || q === "admin" || q === "all") return q;
  return bodyHub ?? "all";
}

async function sessionKey(): Promise<string> {
  const jar = await cookies();
  const existing = jar.get(PLATFORM_CHAT_COOKIE)?.value?.trim();
  if (existing) return existing;
  return randomUUID();
}

/** Persisted KB copilot chat — no OpenAI. */
export async function GET(req: Request) {
  try {
    if (rateLimitHit(`platform-chat-get:${clientIp(req)}`, 120, 60_000)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const key = await sessionKey();
    const hub = resolveHub(new URL(req.url));
    const conversation = await getOrCreateConversation({ sessionKey: key, hub });

    const res = NextResponse.json({
      conversationId: conversation.id,
      hub: conversation.hub,
      messages: conversation.messages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        kbCitations: m.kbCitations,
        createdAt: m.createdAt.toISOString(),
      })),
    });

    const jar = await cookies();
    if (!jar.get(PLATFORM_CHAT_COOKIE)?.value) {
      res.cookies.set(PLATFORM_CHAT_COOKIE, key, {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
      });
    }
    return res;
  } catch (e) {
    return apiErrorResponse(e, { route: "GET /api/platform/chat" });
  }
}

export async function POST(req: Request) {
  try {
    if (rateLimitHit(`platform-chat-post:${clientIp(req)}`, 60, 60_000)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const json = await req.json().catch(() => null);
    const parsed = PostBody.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }

    const key = await sessionKey();
    const hub = resolveHub(new URL(req.url), parsed.data.hub);
    let conversationId = parsed.data.conversationId;

    if (!conversationId) {
      const conv = await getOrCreateConversation({ sessionKey: key, hub });
      conversationId = conv.id;
    }

    const { assistant, copilot } = await appendChatTurn({
      conversationId,
      userMessage: parsed.data.message.trim(),
      hub,
    });

    const res = NextResponse.json({
      conversationId,
      reply: assistant.content,
      citations: assistant.kbCitations,
      source: copilot.source,
    });

    const jar = await cookies();
    if (!jar.get(PLATFORM_CHAT_COOKIE)?.value) {
      res.cookies.set(PLATFORM_CHAT_COOKIE, key, {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
      });
    }
    return res;
  } catch (e) {
    return apiErrorResponse(e, { route: "POST /api/platform/chat" });
  }
}
