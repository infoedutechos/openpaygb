/**
 * Apply MongoDB driver pool/timeouts when missing from DATABASE_URL.
 * Keeps Atlas connections warm and avoids multi-minute hangs on cold Windows dev.
 */
export function tuneMongoDatabaseUrl(raw: string): string {
  const trimmed = raw.trim();
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
