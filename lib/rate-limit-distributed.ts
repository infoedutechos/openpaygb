/**
 * Optional Upstash Redis REST sliding window (when UPSTASH_REDIS_REST_URL + TOKEN are set).
 * Falls back to in-memory limiter from rate-limit.ts.
 */
import { rateLimitHit } from "@/lib/rate-limit";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function upstashIncr(key: string, windowMs: number): Promise<number | null> {
  const base = process.env.UPSTASH_REDIS_REST_URL?.replace(/\/$/, "");
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!base || !token) return null;

  const windowSec = Math.max(1, Math.ceil(windowMs / 1000));
  const res = await fetch(`${base}/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify([
      ["INCR", key],
      ["EXPIRE", key, windowSec, "NX"],
    ]),
  }).catch(() => null);

  if (!res?.ok) return null;
  const data = (await res.json().catch(() => null)) as { result?: unknown }[] | null;
  const n = data?.[0]?.result;
  return typeof n === "number" ? n : null;
}

/** Returns true when the limit is exceeded. Uses Upstash when configured. */
export async function rateLimitExceeded(key: string, limit: number, windowMs: number): Promise<boolean> {
  const n = await upstashIncr(`rl:${key}`, windowMs);
  if (n !== null) return n > limit;
  return rateLimitHit(key, limit, windowMs);
}

export async function rateLimitBackoff(key: string, limit: number, windowMs: number): Promise<boolean> {
  const hit = await rateLimitExceeded(key, limit, windowMs);
  if (hit) await sleep(50);
  return hit;
}
