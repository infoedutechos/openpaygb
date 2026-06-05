import { cookies } from "next/headers";
import { randomUUID } from "node:crypto";

export const PLATFORM_SESSION_COOKIE = "platform_session";
export const PLATFORM_CHAT_COOKIE = "platform_chat_session";

export async function getOrCreatePlatformSessionKey(): Promise<string> {
  const jar = await cookies();
  const existing = jar.get(PLATFORM_SESSION_COOKIE)?.value?.trim();
  if (existing) return existing;
  return randomUUID();
}

export function readerKeyFromSession(sessionKey: string): string {
  return `session:${sessionKey}`;
}
