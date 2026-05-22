import type { Payment } from "@prisma/client";

type BridgePayload = {
  paymentId: string;
  totalUgx: number;
  tonAmount: number;
  destinationWallet: string;
};

/**
 * After MoMo confirms UGX, optionally notify a worker or exchange service.
 * Set **BRIDGE_WEBHOOK_URL** (POST JSON) and optional **BRIDGE_WEBHOOK_SECRET** (Bearer).
 * Set **EXCHANGE_SWAP_URL** for a second optional call (your UGX→TON microservice).
 */
export async function processUgXtoTonBridge(
  payment: Pick<Payment, "id" | "totalUgx" | "tonAmount" | "destinationWallet" | "rail">
): Promise<void> {
  if (payment.rail !== "momo_bridge") return;

  const body: BridgePayload = {
    paymentId: payment.id,
    totalUgx: payment.totalUgx,
    tonAmount: payment.tonAmount,
    destinationWallet: payment.destinationWallet,
  };

  const hook = process.env.BRIDGE_WEBHOOK_URL?.trim();
  if (hook) {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    const secret = process.env.BRIDGE_WEBHOOK_SECRET?.trim();
    if (secret) headers.Authorization = `Bearer ${secret}`;
    const res = await fetch(hook, { method: "POST", headers, body: JSON.stringify(body) });
    if (!res.ok) {
      console.error("[bridge] BRIDGE_WEBHOOK_URL", res.status, await res.text().catch(() => ""));
    }
  }

  const swap = process.env.EXCHANGE_SWAP_URL?.trim();
  if (swap) {
    const res = await fetch(swap, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      console.error("[bridge] EXCHANGE_SWAP_URL", res.status, await res.text().catch(() => ""));
    }
  }
}

export function enqueueUgXtoTonBridge(
  payment: Pick<Payment, "id" | "totalUgx" | "tonAmount" | "destinationWallet" | "rail">
): void {
  void processUgXtoTonBridge(payment).catch((e) => console.error("[bridge]", e));
}
