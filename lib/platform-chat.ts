import { prisma } from "@/lib/prisma";
import { withPrismaRetry } from "@/lib/prisma-retry";
import { composeCopilotReply } from "@/lib/knowledge-base/copilot-reply";
import { buildCopilotIntro, getCopilotAssistantContext } from "@/lib/copilot-assistant-context";
import type { PlatformHub } from "@/lib/knowledge-base/types";

export async function getOrCreateConversation(opts: {
  sessionKey: string;
  hub: PlatformHub;
  studentId?: string | null;
  adminEmail?: string | null;
}) {
  const existing = await withPrismaRetry(() =>
    prisma.chatConversation.findFirst({
      where: { sessionKey: opts.sessionKey, status: "open" },
      orderBy: { updatedAt: "desc" },
      include: { messages: { orderBy: { createdAt: "asc" }, take: 50 } },
    }),
  );
  if (existing) return existing;

  const ctx = await getCopilotAssistantContext();
  const intro = buildCopilotIntro(ctx);

  return withPrismaRetry(() =>
    prisma.chatConversation.create({
      data: {
        sessionKey: opts.sessionKey,
        hub: opts.hub,
        studentId: opts.studentId ?? undefined,
        adminEmail: opts.adminEmail ?? undefined,
        messages: {
          create: {
            role: "assistant",
            content: intro,
            kbCitations: ["platform-help-copilot"],
          },
        },
      },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    }),
  );
}

/** Force a brand-new open conversation (previous open chats become closed). */
export async function startNewConversation(opts: {
  sessionKey: string;
  hub: PlatformHub;
}) {
  await withPrismaRetry(() =>
    prisma.chatConversation.updateMany({
      where: { sessionKey: opts.sessionKey, status: "open" },
      data: { status: "closed" },
    }),
  );
  return getOrCreateConversation(opts);
}

export async function listSessionConversations(opts: {
  sessionKey: string;
  take?: number;
}) {
  const rows = await withPrismaRetry(() =>
    prisma.chatConversation.findMany({
      where: { sessionKey: opts.sessionKey },
      orderBy: { updatedAt: "desc" },
      take: opts.take ?? 30,
      include: {
        messages: {
          where: { role: "user" },
          orderBy: { createdAt: "asc" },
          take: 1,
        },
      },
    }),
  );

  return rows.map((r) => {
    const firstUser = r.messages[0]?.content?.trim() ?? "";
    const title =
      firstUser.length > 0
        ? firstUser.slice(0, 64) + (firstUser.length > 64 ? "…" : "")
        : r.topic && r.topic !== "support"
          ? r.topic.slice(0, 64)
          : "New chat";
    return {
      id: r.id,
      hub: r.hub,
      status: r.status,
      title,
      updatedAt: r.updatedAt.toISOString(),
    };
  });
}

export async function getConversationForSession(opts: {
  sessionKey: string;
  conversationId: string;
}) {
  return withPrismaRetry(() =>
    prisma.chatConversation.findFirst({
      where: { id: opts.conversationId, sessionKey: opts.sessionKey },
      include: { messages: { orderBy: { createdAt: "asc" }, take: 80 } },
    }),
  );
}

export async function appendChatTurn(opts: {
  conversationId: string;
  userMessage: string;
  hub: PlatformHub;
}) {
  const copilot = await composeCopilotReply(opts.userMessage, opts.hub);

  await withPrismaRetry(() =>
    prisma.chatMessage.create({
      data: {
        conversationId: opts.conversationId,
        role: "user",
        content: opts.userMessage,
      },
    }),
  );

  const assistant = await withPrismaRetry(() =>
    prisma.chatMessage.create({
      data: {
        conversationId: opts.conversationId,
        role: "assistant",
        content: copilot.reply,
        kbCitations: copilot.citations,
      },
    }),
  );

  const topic = opts.userMessage.trim().slice(0, 80);
  await withPrismaRetry(() =>
    prisma.chatConversation.update({
      where: { id: opts.conversationId },
      data: {
        updatedAt: new Date(),
        ...(topic ? { topic } : {}),
        status: "open",
      },
    }),
  );

  return { assistant, copilot };
}
