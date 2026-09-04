/**
 * Network Visa/MC issuing (separate from closed-loop OpenPayGB platform card).
 *
 * Paths:
 * - `livepay` — LivePay card issuing API when LIVEPAY_CARD_ISSUING_URL + keys are set
 * - `visa_vdp` — Visa Developer Platform (mTLS) for partner/BIN-sponsored programs
 *
 * Never store full PAN/CVV — only last4 + provider token/id.
 */

import { deploymentEnv } from "@/lib/deployment-env-resolve";

export type CardIssuingProvider = "livepay" | "visa_vdp" | null;

export type IssueNetworkCardInput = {
  holderName: string;
  email: string;
  phoneE164?: string;
  studentId?: string;
  organizationId?: string;
  currency?: "UGX" | "USD";
  /** Idempotency key for the issuer */
  clientReference: string;
};

export type IssueNetworkCardResult = {
  provider: Exclude<CardIssuingProvider, null>;
  providerCardId: string;
  last4: string;
  network: "visa" | "mastercard" | "unknown";
  status: "pending" | "active" | "failed";
  /** Opaque token from issuer — never a full PAN */
  providerToken?: string;
  rawMessage?: string;
};

export function cardIssuingProvider(): CardIssuingProvider {
  const pref = deploymentEnv("CARD_ISSUING_PROVIDER").toLowerCase();
  if (pref === "livepay" || pref === "visa" || pref === "visa_vdp") {
    if (pref === "visa" || pref === "visa_vdp") return "visa_vdp";
    return "livepay";
  }
  if (deploymentEnv("LIVEPAY_CARD_ISSUING_URL") && deploymentEnv("LIVEPAY_API_KEY")) return "livepay";
  if (deploymentEnv("VISA_USER_ID") && deploymentEnv("VISA_PASSWORD")) return "visa_vdp";
  return null;
}

export function isCardIssuingConfigured(): boolean {
  const p = cardIssuingProvider();
  if (p === "livepay") {
    return Boolean(deploymentEnv("LIVEPAY_CARD_ISSUING_URL") && deploymentEnv("LIVEPAY_API_KEY"));
  }
  if (p === "visa_vdp") {
    return Boolean(
      deploymentEnv("VISA_USER_ID") &&
        deploymentEnv("VISA_PASSWORD") &&
        (deploymentEnv("VISA_CERT_PATH") || deploymentEnv("VISA_CERT_PEM")) &&
        (deploymentEnv("VISA_KEY_PATH") || deploymentEnv("VISA_KEY_PEM")),
    );
  }
  return false;
}

export function cardIssuingNotReadyMessage(): string {
  return (
    "Network Visa/MC issuing is not live yet. Set CARD_ISSUING_PROVIDER=livepay|visa_vdp with issuer credentials, " +
    "or complete BIN-sponsor onboarding (developer.visa.com project + bank/processor). " +
    "Closed-loop OpenPayGB card remains available without network issuing."
  );
}
