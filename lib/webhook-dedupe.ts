import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";

/** Returns true if this was the first time (record inserted). */
export async function tryMarkWebhookProcessed(provider: string, dedupeKey: string): Promise<boolean> {
  const key = `${provider}:${dedupeKey}`.slice(0, 900);
  try {
    await prisma.processedWebhook.create({
      data: { dedupeKey: key, provider },
    });
    return true;
  } catch {
    return false;
  }
}

export function sha256Json(body: unknown): string {
  const s = typeof body === "string" ? body : JSON.stringify(body ?? {});
  return createHash("sha256").update(s).digest("hex");
}
