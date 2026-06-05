import { clientIp, rateLimitHit } from "@/lib/rate-limit";

/** ~20 min of polling every 3s on one payment (checkout UX). */
const PER_PAYMENT_LIMIT = 450;
const PER_PAYMENT_WINDOW_MS = 30 * 60 * 1000;

/** Safety cap when many different payment ids are polled from one IP. */
const PER_IP_LIMIT = 900;
const PER_IP_WINDOW_MS = 60 * 60 * 1000;

/**
 * Rate limits for GET /api/payments/:id/public.
 * Keyed per payment id so one checkout session is not starved by the global IP bucket alone.
 */
export function paymentPublicPollRateLimited(req: Request, paymentId: string): boolean {
  const ip = clientIp(req);
  if (rateLimitHit(`payment-public:pid:${paymentId}`, PER_PAYMENT_LIMIT, PER_PAYMENT_WINDOW_MS)) {
    return true;
  }
  if (rateLimitHit(`payment-public:ip:${ip}`, PER_IP_LIMIT, PER_IP_WINDOW_MS)) {
    return true;
  }
  return false;
}
