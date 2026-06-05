import { prisma } from "@/lib/prisma";

const TRANSIENT_PATTERNS = [
  "Server selection timeout",
  "No available servers",
  "ReplicaSetNoPrimary",
  "Raw query failed",
  "PrismaClientInitializationError",
  "MongoServerSelectionError",
  "MongoNetworkError",
  "connection was forcibly closed",
  "RetryableWriteError",
  "TransientTransactionError",
  "write conflict",
  "I/O error",
  "os error 10054",
  "ECONNRESET",
  "ETIMEDOUT",
  "ENOTFOUND",
  "zimtvpl.mongodb",
  "mongodb.net",
  "-shard-00-",
] as const;

/** User-facing copy for APIs and banners when Atlas is unreachable. */
export const DB_UNAVAILABLE_MESSAGE =
  "Database is temporarily unavailable. Wait a moment and try again.";

export function isTransientMongoError(err: unknown): boolean {
  const msg = String((err as { message?: string })?.message ?? err ?? "");
  return TRANSIENT_PATTERNS.some((p) => msg.includes(p));
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Retry Prisma calls when Atlas drops idle connections (common on Windows dev). */
export async function withPrismaRetry<T>(
  fn: () => Promise<T>,
  opts?: { attempts?: number; baseDelayMs?: number },
): Promise<T> {
  const attempts = opts?.attempts ?? 4;
  const baseDelayMs = opts?.baseDelayMs ?? 400;
  let last: unknown;

  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      last = e;
      if (!isTransientMongoError(e) || i >= attempts - 1) throw e;
      await prisma.$disconnect().catch(() => {});
      await sleep(baseDelayMs * (i + 1));
    }
  }
  throw last;
}
