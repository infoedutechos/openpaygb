import { inspect } from "util";
import dns from "node:dns";
import { PrismaClient } from "@prisma/client";
import { tuneMongoDatabaseUrl } from "@/lib/mongodb-connection-url";

/** Prefer public DNS + IPv4 on Windows so Atlas A-records resolve when hotspot DNS returns 10051. */
function installDevDnsPreferences(): void {
  if (process.env.MONGODB_PUBLIC_DNS === "0") return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fb = require(/* webpackIgnore: true */ "../scripts/mongodb-srv-fallback.cjs") as {
      preferPublicDnsForNode?: () => boolean;
    };
    if (typeof fb.preferPublicDnsForNode === "function") {
      fb.preferPublicDnsForNode();
      return;
    }
  } catch {
    /* fall through */
  }
  try {
    dns.setServers(["8.8.8.8", "1.1.1.1"]);
    dns.setDefaultResultOrder("ipv4first");
  } catch {
    /* ignore */
  }
}

installDevDnsPreferences();

const dbUrl = process.env.DATABASE_URL?.trim() || process.env.MONGODB_URI?.trim();
if (dbUrl) {
  process.env.DATABASE_URL = tuneMongoDatabaseUrl(dbUrl);
}

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
      /Server selection timeout|ReplicaSetNoPrimary|No available servers|received fatal alert:\s*InternalError|Raw query failed|zimtvpl\.mongodb|ac-[a-z0-9]+-shard|DNS resolution|unreachable network|os error 10051|os error 10013/i.test(
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

/** Turbopack HMR can keep an old Prisma singleton from before `prisma generate`. */
function prismaClientMissingExpectedModels(client: PrismaClient): boolean {
  if (process.env.NODE_ENV !== "development") return false;
  return !(client as PrismaClient & { deploymentEnvOverride?: unknown }).deploymentEnvOverride;
}

function recyclePrismaClient(): void {
  if (!globalForPrisma.prisma) return;
  void globalForPrisma.prisma.$disconnect().catch(() => {});
  globalForPrisma.prisma = undefined;
}

if (process.env.NODE_ENV === "development") {
  if (globalForPrisma.prismaClientStamp !== clientStamp) {
    recyclePrismaClient();
    globalForPrisma.prismaClientStamp = clientStamp;
  } else if (globalForPrisma.prisma && prismaClientMissingExpectedModels(globalForPrisma.prisma)) {
    console.warn("[prisma] Stale client (missing DeploymentEnvOverride) — recreating. Run: npm run db:generate");
    recyclePrismaClient();
  }
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
