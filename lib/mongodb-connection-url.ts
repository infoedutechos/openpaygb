import { createRequire } from "node:module";
import { join } from "node:path";

/**
 * When Node cannot querySrv (Windows DNS / firewall), expand mongodb+srv via system DNS.
 * No-op when Node SRV works or fallback is disabled (`MONGODB_SRV_FALLBACK=0`).
 */
export function expandMongodbSrvIfNeeded(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed.toLowerCase().startsWith("mongodb+srv://")) return trimmed;
  try {
    const requireFromRoot = createRequire(join(process.cwd(), "package.json"));
    const { ensureNonSrvDatabaseUrl } = requireFromRoot("./scripts/mongodb-srv-fallback.cjs") as {
      ensureNonSrvDatabaseUrl: (
        url: string,
        opts?: { quiet?: boolean },
      ) => { url: string; converted: boolean };
    };
    return ensureNonSrvDatabaseUrl(trimmed, { quiet: true }).url;
  } catch {
    return trimmed;
  }
}

/**
 * Apply MongoDB driver pool/timeouts when missing from DATABASE_URL.
 * Keeps Atlas connections warm and avoids multi-minute hangs on cold Windows dev.
 * Also expands broken mongodb+srv URLs on Windows so Prisma can connect.
 */
export function tuneMongoDatabaseUrl(raw: string): string {
  const trimmed = expandMongodbSrvIfNeeded(raw.trim());
  if (!trimmed || !/^mongodb(\+srv)?:\/\//i.test(trimmed)) return trimmed;

  try {
    const url = new URL(trimmed);
    const setDefault = (key: string, value: string) => {
      if (!url.searchParams.has(key)) url.searchParams.set(key, value);
    };

    setDefault("retryWrites", "true");
    setDefault("w", "majority");
    setDefault("maxPoolSize", process.env.NODE_ENV === "production" ? "50" : "20");
    setDefault("minPoolSize", process.env.NODE_ENV === "production" ? "5" : "2");
    setDefault("maxIdleTimeMS", "60000");
    setDefault("serverSelectionTimeoutMS", "8000");
    setDefault("connectTimeoutMS", "10000");
    setDefault("socketTimeoutMS", "30000");

    return url.toString();
  } catch {
    return trimmed;
  }
}
