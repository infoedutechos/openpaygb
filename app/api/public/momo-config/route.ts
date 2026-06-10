import { NextResponse } from "next/server";
import { deploymentEnv, warmDeploymentEnvCache } from "@/lib/deployment-env-resolve";
import { getMomoWebhookUrl } from "@/lib/webhook-public-urls";

/** Public MoMo bridge webhook alignment helper (no secret values). */
export async function GET() {
  await warmDeploymentEnvCache();
  const configured = Boolean(deploymentEnv("MOMO_WEBHOOK_SECRET"));
  return NextResponse.json({
    enabled: configured && Boolean(deploymentEnv("MOMO_COLLECTION_URL")),
    webhookUrl: getMomoWebhookUrl(),
    webhookSecretConfigured: configured,
    authHeader: "x-momo-webhook-secret",
  });
}
