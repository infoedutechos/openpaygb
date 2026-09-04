/**
 * Placeholder for **MTN MoMo Collection** / **Airtel** “request to pay” APIs.
 *
 * Typical env (MAC / DeploymentEnvOverride via `deploymentEnv`): `MOMO_SUBSCRIPTION_KEY`,
 * `MOMO_COLLECTION_URL`, `MOMO_PROVIDER`, callback host — see provider docs for your country product.
 */

import { deploymentEnv } from "@/lib/deployment-env-resolve";

export type InitiateCollectInput = {
  paymentId: string;
  amountUgx: number;
  phoneSubscriber: string;
  payerMessage?: string;
};

export async function initiateMomoCollect(_input: InitiateCollectInput): Promise<{ ok: boolean; note: string }> {
  void _input;
  const configured = Boolean(deploymentEnv("MOMO_SUBSCRIPTION_KEY"));
  return {
    ok: configured,
    note: configured
      ? "Wire initiateMomoCollect() to your MoMo product (Collection, Sandbox → Production)."
      : "Set MOMO_SUBSCRIPTION_KEY in Master Admin (payment provider credentials); use POST /api/collect/momo to create the ledger row first.",
  };
}
