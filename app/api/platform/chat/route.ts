import { NextResponse } from "next/server";
import { z } from "zod";
import { clientIp, rateLimitHit } from "@/lib/rate-limit";
import { apiErrorResponse } from "@/lib/api-error";
import {
  appendChatTurn,
  getConversationForSession,
  getOrCreateConversation,
  listSessionConversations,
  startNewConversation,
} from "@/lib/platform-chat";
import type { PlatformHub } from "@/lib/knowledge-base/types";
import { PLATFORM_CHAT_COOKIE } from "@/lib/platform-reader-key";
import { cookies } from "next/headers";
import { randomUUID } from "node:crypto";

const HubEnum = z.enum(["all", "tuition", "play", "admin", "dex"]);

const PostBody = z.object({
  action: z.enum(["new", "message"]).optional(),
  message: z.string().min(1).max(4000).optional(),
  hub: HubEnum.optional(),
  conversationId: z.string().optional(),
});

function resolveHub(url: URL, bodyHub?: PlatformHub): PlatformHub {
  const q = url.searchParams.get("hub");
  if (q === "tuition" || q === "play" || q === "admin" || q === "all" || q === "dex") return q;
  return bodyHub ?? "all";
}

async function sessionKey(): Promise<string> {
  const jar = await cookies();
  const existing = jar.get(PLATFORM_CHAT_COOKIE)?.value?.trim();
  if (existing) return existing;
  return randomUUID();
}

async function attachSessionCookie(res: NextResponse, key: string) {
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
}

/** Persisted KB copilot chat — no OpenAI. */
export async function GET(req: Request) {
  try {
    if (rateLimitHit(`platform-chat-get:${clientIp(req)}`, 120, 60_000)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const key = await sessionKey();
    const url = new URL(req.url);
    const hub = resolveHub(url);
    const list = url.searchParams.get("list") === "1";
    const conversationId = url.searchParams.get("conversationId")?.trim() || null;

    if (list) {
      const conversations = await listSessionConversations({ sessionKey: key, take: 40 });
      return attachSessionCookie(NextResponse.json({ conversations }), key);
    }

    if (conversationId) {
      const conversation = await getConversationForSession({ sessionKey: key, conversationId });
      if (!conversation) {
        return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
      }
      return attachSessionCookie(
        NextResponse.json({
          conversationId: conversation.id,
          hub: conversation.hub,
          messages: conversation.messages.map((m) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            kbCitations: m.kbCitations,
            createdAt: m.createdAt.toISOString(),
          })),
        }),
        key,
      );
    }

    try {
      const conversation = await getOrCreateConversation({ sessionKey: key, hub });
      return attachSessionCookie(
        NextResponse.json({
          conversationId: conversation.id,
          hub: conversation.hub,
          messages: conversation.messages.map((m) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            kbCitations: m.kbCitations,
            createdAt: m.createdAt.toISOString(),
          })),
        }),
        key,
      );
    } catch (chatErr) {
      console.warn("[GET /api/platform/chat] conversation load failed", chatErr);
      return NextResponse.json({
        conversationId: null,
        hub,
        messages: [],
        degraded: true,
      });
    }
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

    if (parsed.data.action === "new") {
      const conversation = await startNewConversation({ sessionKey: key, hub });
      return attachSessionCookie(
        NextResponse.json({
          conversationId: conversation.id,
          hub: conversation.hub,
          messages: conversation.messages.map((m) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            kbCitations: m.kbCitations,
            createdAt: m.createdAt.toISOString(),
          })),
        }),
        key,
      );
    }

    const text = parsed.data.message?.trim();
    if (!text) {
      return NextResponse.json({ error: "Message required" }, { status: 400 });
    }

    let conversationId = parsed.data.conversationId;
    if (!conversationId) {
      const conv = await getOrCreateConversation({ sessionKey: key, hub });
      conversationId = conv.id;
    }

    const { assistant, copilot } = await appendChatTurn({
      conversationId,
      userMessage: text,
      hub,
    });

    return attachSessionCookie(
      NextResponse.json({
        conversationId,
        reply: assistant.content,
        citations: assistant.kbCitations,
        source: copilot.source,
      }),
      key,
    );
  } catch (e) {
    return apiErrorResponse(e, { route: "POST /api/platform/chat" });
  }
}
