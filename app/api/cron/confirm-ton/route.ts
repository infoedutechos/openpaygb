import { NextResponse } from "next/server";
import { warmDeploymentEnvCache } from "@/lib/deployment-env-resolve";
import { runTonInboundConfirmJob } from "@/lib/ton/run-confirm-job";
import { requireCronAuth } from "@/lib/production-secrets";

/** Vercel Serverless max duration (Hobby caps at 10s; raise on Pro if TonAPI is slow). */
export const maxDuration = 30;

/**
 * Vercel Cron / manual: scans TonAPI for inbound TON and confirms matching pending payments.
 * Protect with `CRON_SECRET` — send `Authorization: Bearer <CRON_SECRET>`.
 * Set `TON_CONFIRM_ENABLED=false` to no-op (returns skipped).
 */
export async function GET(req: Request) {
  if (process.env.TON_CONFIRM_ENABLED === "false") {
    return NextResponse.json({ ok: true, skipped: true, reason: "TON_CONFIRM_ENABLED=false" });
  }

  await warmDeploymentEnvCache();
  const cronAuth = requireCronAuth(req);
  if (!cronAuth.ok) return cronAuth.response;

  const result = await runTonInboundConfirmJob();
  if (!result.ok) {
    return NextResponse.json(result, { status: 503 });
  }
  return NextResponse.json(result);
}
