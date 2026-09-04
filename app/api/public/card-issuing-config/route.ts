import { NextResponse } from "next/server";
import { warmDeploymentEnvCache, deploymentEnv } from "@/lib/deployment-env-resolve";
import {
  cardIssuingProvider,
  isCardIssuingConfigured,
  visaVdpHelloWorld,
} from "@/lib/card-issuing";
import { getVisaIssuingWebhookUrl } from "@/lib/webhook-public-urls";
import { apiErrorResponse } from "@/lib/api-error";

/** Public readiness for network Visa/MC issuing (not closed-loop OpenPayGB card). */
export async function GET() {
  try {
    await warmDeploymentEnvCache();
    const provider = cardIssuingProvider();
    const configured = isCardIssuingConfigured();
    const probe = deploymentEnv("VISA_PROBE_ON_CONFIG") === "1" && provider === "visa_vdp" && configured;

    let hello: { ok: boolean; status: number } | null = null;
    if (probe) {
      try {
        const r = await visaVdpHelloWorld();
        hello = { ok: r.ok, status: r.status };
      } catch {
        hello = { ok: false, status: 0 };
      }
    }

    return NextResponse.json({
      enabled: configured,
      configured,
      provider,
      webhookUrl: getVisaIssuingWebhookUrl(),
      visaEnv: deploymentEnv("VISA_ENV") || "sandbox",
      visaIssuePathSet: Boolean(deploymentEnv("VISA_ISSUE_PATH")),
      livePayIssuingUrlSet: Boolean(deploymentEnv("LIVEPAY_CARD_ISSUING_URL")),
      helloWorld: hello,
      note:
        "Network issuing needs a BIN sponsor (LivePay card API or Visa program). Closed-loop OpenPayGB card does not require this.",
    });
  } catch (e) {
    return apiErrorResponse(e, { route: "GET /api/public/card-issuing-config" });
  }
}
