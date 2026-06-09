import { NextResponse } from "next/server";
import { warmDeploymentEnvCache } from "@/lib/deployment-env-resolve";
import { requireCronAuth } from "@/lib/production-secrets";
import { runTelegramTuitionDueReminders } from "@/lib/telegram/tuition-reminders";

export const maxDuration = 60;

export async function GET(req: Request) {
  await warmDeploymentEnvCache();
  const cronAuth = requireCronAuth(req);
  if (!cronAuth.ok) return cronAuth.response;

  const result = await runTelegramTuitionDueReminders();
  return NextResponse.json({ ok: true, ...result });
}
