import { inspect } from "util";
import { PrismaClient } from "@prisma/client";

/**
 * In dev, Prisma logs huge `prisma:error` blocks for MongoDB Atlas TLS/timeout; Next forwards them to the browser.
 * Filter those only (errors still throw). Set `PRISMA_VERBOSE_ERRORS=1` to see full Prisma output.
 */
function installDevAtlasConsoleFilter(): void {
  if (process.env.NODE_ENV !== "development") return;
  if (process.env.PRISMA_VERBOSE_ERRORS === "1") return;
  const g = globalThis as { __odelhubPrismaConsoleFilter?: boolean };
  if (g.__odelhubPrismaConsoleFilter) return;
  g.__odelhubPrismaConsoleFilter = true;

  const orig = console.error.bind(console);
  console.error = (...args: unknown[]) => {
    const text = args
      .map((a) => {
        if (typeof a === "string") return a;
        if (a instanceof Error) return `${a.message}\n${a.stack ?? ""}`;
        try {
          return inspect(a, { depth: 2, breakLength: 120, maxStringLength: 12_000 });
        } catch {
          return String(a);
        }
      })
      .join("\n");

    const prismaTagged =
      /prisma:error|Invalid[\s`]+prisma\.|PrismaClientKnownRequestError|\bP2010\b/i.test(text) ||
      (/Invalid/i.test(text) && /prisma\.\w+\(/i.test(text));
    const atlasTopology =
      /Server selection timeout|ReplicaSetNoPrimary|No available servers|received fatal alert:\s*InternalError|Raw query failed|zimtvpl\.mongodb|ac-[a-z0-9]+-shard/i.test(
        text,
      );
    if (prismaTagged && atlasTopology) return;
    orig(...args);
  };
}

installDevAtlasConsoleFilter();

type PrismaGlobal = {
  prisma?: PrismaClient;
  prismaClientStamp?: string;
};

/** Dev-only: invalidate singleton when `scripts/ensure-prisma-client.cjs` writes a new stamp after generate. */
function devClientStamp(): string {
  if (process.env.NODE_ENV !== "development") return "prod";
  return process.env.PRISMA_CLIENT_STAMP?.trim() || "dev-default";
}

const globalForPrisma = globalThis as unknown as PrismaGlobal;
const clientStamp = devClientStamp();

if (process.env.NODE_ENV === "development" && globalForPrisma.prismaClientStamp !== clientStamp) {
  if (globalForPrisma.prisma) {
    void globalForPrisma.prisma.$disconnect().catch(() => {});
  }
  globalForPrisma.prisma = undefined;
  globalForPrisma.prismaClientStamp = clientStamp;
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn"] : ["error"],
  });

globalForPrisma.prisma = prisma;
if (process.env.NODE_ENV === "development") {
  globalForPrisma.prismaClientStamp = clientStamp;
}
