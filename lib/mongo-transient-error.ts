/** Shared Mongo/Atlas transient error detection (safe for client + server). */

export const DB_UNAVAILABLE_MESSAGE =
  "Database is temporarily unavailable. Wait a moment and try again.";

/** Extra hint for Windows DNS / hotspot failures (dev-friendly; still safe in prod). */
export function dbUnavailableClientMessage(err?: unknown): string {
  const msg = String((err as { message?: string })?.message ?? err ?? "");
  if (
    /DNS resolution|unreachable network|os error 10051|os error 10013|os error 11001|ENOTFOUND|querySrv/i.test(
      msg,
    )
  ) {
    return (
      "Database DNS/network unreachable. Check internet (hotspot DNS often breaks Atlas). " +
      "Dev fix: restart `npm run dev` (auto non-SRV + public DNS), or set MONGODB_FORCE_NON_SRV=1."
    );
  }
  return DB_UNAVAILABLE_MESSAGE;
}

const TRANSIENT_PATTERNS = [
  "Server selection timeout",
  "No available servers",
  "ReplicaSetNoPrimary",
  "Raw query failed",
  "PrismaClientInitializationError",
  "PrismaClientUnknownRequestError",
  "MongoServerSelectionError",
  "MongoNetworkError",
  "connection was forcibly closed",
  "RetryableWriteError",
  "TransientTransactionError",
  "write conflict",
  "I/O error",
  "os error 10054",
  "os error 10051",
  "os error 10013",
  "os error 11001",
  "server monitor timeout",
  "No such host is known",
  "forbidden by its access permissions",
  "unreachable network",
  "DNS resolution",
  "ECONNRESET",
  "ETIMEDOUT",
  "ENOTFOUND",
  "Response from the Engine was empty",
  "Engine is not yet connected",
  "Prisma deadline exceeded",
  "zimtvpl.mongodb",
  "mongodb.net",
  "-shard-00-",
] as const;

export function isPrismaEngineEmptyError(err: unknown): boolean {
  const name = (err as { name?: string })?.name ?? "";
  const msg = String((err as { message?: string })?.message ?? err ?? "");
  return (
    name === "PrismaClientUnknownRequestError" ||
    msg.includes("Response from the Engine was empty") ||
    msg.includes("Engine is not yet connected")
  );
}

export function isTransientMongoError(err: unknown): boolean {
  const msg = String((err as { message?: string })?.message ?? err ?? "");
  return TRANSIENT_PATTERNS.some((p) => msg.includes(p));
}
