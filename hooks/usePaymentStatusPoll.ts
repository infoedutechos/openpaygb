"use client";

import { useCallback, useEffect, useRef } from "react";
import { fetchPaymentPublicStatus } from "@/utils/fetch-payment-public";

const POLL_STEPS = new Set([
  "mbiyo_waiting",
  "connect_wallet",
  "confirm_payment",
  "processing",
]);

type Args = {
  paymentId: string | null;
  step: string;
  chainStatus: "pending" | "confirmed";
  onUpdate: (payment: {
    status: string;
    memo?: string | null;
    txHash?: string;
    receiptAccessToken?: string | null;
  }) => void;
  onInvalid?: (status: 400 | 404) => void;
  onRateLimited?: () => void;
};

/**
 * Poll GET /api/payments/:id/public while checkout is waiting for confirmation.
 * Stops when confirmed, backs off on 429, and only runs on pay/wait steps.
 */
export function usePaymentStatusPoll({
  paymentId,
  step,
  chainStatus,
  onUpdate,
  onInvalid,
  onRateLimited,
}: Args) {
  const onUpdateRef = useRef(onUpdate);
  const onInvalidRef = useRef(onInvalid);
  const onRateLimitedRef = useRef(onRateLimited);
  onUpdateRef.current = onUpdate;
  onInvalidRef.current = onInvalid;
  onRateLimitedRef.current = onRateLimited;

  const tick = useCallback(async (): Promise<number | null> => {
    if (!paymentId) return null;
    const result = await fetchPaymentPublicStatus(paymentId);
    if (result.ok) {
      onUpdateRef.current(result.payment);
      return result.payment.status === "confirmed" ? null : 3000;
    }
    if (result.rateLimited) {
      onRateLimitedRef.current?.();
      return 15000;
    }
    if (result.status === 400 || result.status === 404) {
      onInvalidRef.current?.(result.status);
      return null;
    }
    return 5000;
  }, [paymentId]);

  useEffect(() => {
    if (!paymentId || chainStatus === "confirmed" || !POLL_STEPS.has(step)) return;

    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let ticks = 0;
    const maxTicks = step === "processing" ? 240 : step === "mbiyo_waiting" ? 300 : 180;

    const schedule = (delayMs: number) => {
      if (cancelled) return;
      timeoutId = setTimeout(() => void run(), delayMs);
    };

    const run = async () => {
      if (cancelled || ticks >= maxTicks) return;
      ticks += 1;
      const nextMs = await tick();
      if (cancelled || nextMs === null) return;
      schedule(nextMs);
    };

    void run();

    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [paymentId, step, chainStatus, tick]);
}
