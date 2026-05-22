/**
 * Best-effort in-memory sliding window (per serverless instance).
 * Use Vercel Firewall / Upstash in production for strict limits.
 */
const buckets = new Map<string, { reset: number; n: number }>();

export function rateLimitHit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  let b = buckets.get(key);
  if (!b || now > b.reset) {
    b = { reset: now + windowMs, n: 0 };
    buckets.set(key, b);
  }
  b.n += 1;
  return b.n > limit;
}

export function clientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip")?.trim() ||
    "unknown"
  );
}
