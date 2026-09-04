import "server-only";

import { deploymentEnv } from "@/lib/deployment-env-resolve";
import type { IssueNetworkCardInput, IssueNetworkCardResult } from "@/lib/card-issuing/types";

/**
 * LivePay virtual card issuing — endpoint URL is program-specific (ask LivePay for docs).
 * Set LIVEPAY_CARD_ISSUING_URL to the create-card path they provide.
 */
export async function livePayIssueCard(input: IssueNetworkCardInput): Promise<IssueNetworkCardResult> {
  const url = deploymentEnv("LIVEPAY_CARD_ISSUING_URL").trim();
  const apiKey = deploymentEnv("LIVEPAY_API_KEY").trim();
  if (!url || !apiKey) {
    throw new Error("LIVEPAY_CARD_ISSUING_URL and LIVEPAY_API_KEY required for LivePay issuing.");
  }

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      reference: input.clientReference,
      name: input.holderName,
      email: input.email,
      phone: input.phoneE164,
      currency: input.currency || "UGX",
      student_id: input.studentId,
      organization_id: input.organizationId,
    }),
    cache: "no-store",
  });

  const json = (await res.json().catch(() => ({}))) as {
    message?: string;
    error?: string;
    data?: {
      id?: string;
      card_id?: string;
      last4?: string;
      last_four?: string;
      network?: string;
      status?: string;
      token?: string;
    };
    id?: string;
    last4?: string;
  };

  if (!res.ok) {
    throw new Error(json.message || json.error || `LivePay card issue failed (${res.status})`);
  }

  const data = json.data || {};
  const providerCardId = data.id || data.card_id || json.id || input.clientReference;
  const last4 = (data.last4 || data.last_four || json.last4 || "****").replace(/\D/g, "").slice(-4) || "****";
  const networkRaw = (data.network || "visa").toLowerCase();
  const network = networkRaw.includes("master") ? "mastercard" : networkRaw.includes("visa") ? "visa" : "unknown";
  const statusRaw = (data.status || "pending").toLowerCase();
  const status = statusRaw.includes("active") || statusRaw === "issued" ? "active" : "pending";

  return {
    provider: "livepay",
    providerCardId,
    last4,
    network,
    status,
    providerToken: data.token,
    rawMessage: json.message || "LivePay issue accepted",
  };
}
