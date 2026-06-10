import { NextResponse } from "next/server";
import { warmDeploymentEnvCache } from "@/lib/deployment-env-resolve";
import { getTelegramPublicStatus } from "@/lib/telegram-public-status";

/** Public Telegram bot alignment helper (no token values). */
export async function GET() {
  await warmDeploymentEnvCache();
  return NextResponse.json(getTelegramPublicStatus());
}
