/**
 * Shared MoMo disbursement for merchant cashouts and custodial withdraws.
 * Auto-live when LivePay/Relworx collect/send credentials exist; set OPENPAYGB_CASHOUT_LIVE=0 to queue-only.
 */

import { deploymentEnv, warmDeploymentEnvCache } from "@/lib/deployment-env-resolve";
import { isLivePayConfigured, livePaySendMoney, livePayUserMessage } from "@/lib/livepay/client";
import { isRelworxConfigured, relworxSendPayment, relworxUserMessage } from "@/lib/relworx/client";

export type MomoDisburseInput = {
  phoneDigits: string;
  network: "MTN" | "AIRTEL" | string;
  amountUgx: number;
  reference: string;
  description: string;
};

export type MomoDisburseResult =
  | { ok: true; rail: "livepay" | "relworx"; railReference: string; message: string }
  | { ok: false; reason: string; queued?: boolean };

/** Live MoMo send: auto when LivePay/Relworx configured; set OPENPAYGB_CASHOUT_LIVE=0 to force queue-only. */
export function momoCashoutLiveEnabled(): boolean {
  const flag = deploymentEnv("OPENPAYGB_CASHOUT_LIVE").toLowerCase();
  if (flag === "0" || flag === "false" || flag === "no") return false;
  if (flag === "1" || flag === "true" || flag === "yes") return true;
  return resolveCashoutRail() !== null;
}

export function resolveCashoutRail(): "livepay" | "relworx" | null {
  const pref = deploymentEnv("OPENPAYGB_CASHOUT_RAIL").toLowerCase();
  if (pref === "livepay") return isLivePayConfigured() ? "livepay" : null;
  if (pref === "relworx") return isRelworxConfigured() ? "relworx" : null;
  if (isLivePayConfigured()) return "livepay";
  if (isRelworxConfigured()) return "relworx";
  return null;
}

export async function disburseToMomo(input: MomoDisburseInput): Promise<MomoDisburseResult> {
  await warmDeploymentEnvCache();
  if (!momoCashoutLiveEnabled()) {
    return {
      ok: false,
      queued: true,
      reason:
        "Live cashout disabled (OPENPAYGB_CASHOUT_LIVE=0). Remove that flag or set =1, and ensure LivePay/Relworx keys + float.",
    };
  }

  const rail = resolveCashoutRail();
  if (!rail) {
    return {
      ok: false,
      queued: true,
      reason: "No LivePay/Relworx credentials for send-money.",
    };
  }

  const phone = input.phoneDigits.replace(/\D/g, "");
  const network = (input.network || "MTN").toUpperCase() === "AIRTEL" ? "AIRTEL" : "MTN";
  const amount = Math.round(input.amountUgx);
  const ref = input.reference.replace(/[^a-zA-Z0-9]/g, "").slice(0, 30) || `payout${Date.now()}`;

  try {
    if (rail === "livepay") {
      const res = await livePaySendMoney({
        phoneNumber: phone,
        amountUgx: amount,
        reference: ref,
        description: input.description,
        network,
      });
      return {
        ok: true,
        rail: "livepay",
        railReference: res.internal_reference || res.reference || ref,
        message: res.message || "LivePay send-money accepted",
      };
    }

    const res = await relworxSendPayment({
      msisdn: phone,
      amount,
      reference: ref,
      description: input.description,
    });
    return {
      ok: true,
      rail: "relworx",
      railReference: res.internal_reference || ref,
      message: res.message || "Relworx send-payment accepted",
    };
  } catch (e) {
    const reason = rail === "livepay" ? livePayUserMessage(e) : relworxUserMessage(e);
    return { ok: false, reason };
  }
}
