import { prisma } from "@/lib/prisma";
import { isTransientMongoError } from "@/lib/mongo-transient-error";

export {
  DB_UNAVAILABLE_MESSAGE,
  isPrismaEngineEmptyError,
  isTransientMongoError,
} from "@/lib/mongo-transient-error";

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

/** Cap how long a Prisma call may block (e.g. notification polling when Atlas is down). */
export async function withPrismaDeadline<T>(fn: () => Promise<T>, deadlineMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      fn(),
      new Promise<T>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`Prisma deadline exceeded (${deadlineMs}ms)`)),
          deadlineMs,
        );
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
