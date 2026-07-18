import { createHash, randomUUID } from "node:crypto";

export const VISITOR_COOKIE = "odelhub_vid";

export function hashVisitorId(rawId: string): string {
  return createHash("sha256").update(`odelhub-visit:${rawId}`).digest("hex");
}

export function newVisitorId(): string {
  return randomUUID();
}
