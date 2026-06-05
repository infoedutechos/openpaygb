import "server-only";

import { isTransientMongoError, withPrismaRetry } from "@/lib/prisma-retry";

/** Run an RSC/data loader query with Atlas retry; return fallback only on transient errors. */
export async function runServerDb<T>(
  fn: () => Promise<T>,
  fallback: T | (() => T),
): Promise<T> {
  try {
    return await withPrismaRetry(fn);
  } catch (e) {
    if (!isTransientMongoError(e)) throw e;
    return typeof fallback === "function" ? (fallback as () => T)() : fallback;
  }
}

export type ServerDbResult<T> = { ok: true; data: T } | { ok: false; degraded: true };

/** For RSC pages that must show a banner instead of a misleading empty list. */
export async function tryServerDb<T>(fn: () => Promise<T>): Promise<ServerDbResult<T>> {
  try {
    return { ok: true, data: await withPrismaRetry(fn) };
  } catch (e) {
    if (isTransientMongoError(e)) return { ok: false, degraded: true };
    throw e;
  }
}
