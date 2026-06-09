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

  await withPrismaRetry(() =>
    prisma.chatConversation.update({
      where: { id: opts.conversationId },
      data: { updatedAt: new Date() },
    }),
  );

  return { assistant, copilot };
}
