/**
 * Expand mongodb+srv via system DNS on Windows when Node querySrv fails.
 * Avoids `createRequire(...)` — Webpack warns "failed parsing argument" for dynamic paths.
 */
export function expandMongodbSrvIfNeeded(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed.toLowerCase().startsWith("mongodb+srv://")) return trimmed;
  try {
    // webpackIgnore keeps this a runtime Node require (not bundled / not createRequire).
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require(/* webpackIgnore: true */ "../scripts/mongodb-srv-fallback.cjs") as {
      ensureNonSrvDatabaseUrl: (
        url: string,
        opts?: { quiet?: boolean },
      ) => { url: string; converted: boolean };
    };
    return mod.ensureNonSrvDatabaseUrl(trimmed, { quiet: true }).url;
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
