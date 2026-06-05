import { NextResponse } from "next/server";
import { deploymentEnv } from "@/lib/deployment-env-resolve";

/** True on Vercel production or NODE_ENV=production. */
export function isProductionRuntime(): boolean {
  const vercel = process.env.VERCEL_ENV?.trim().toLowerCase();
  if (vercel === "production") return true;
  return process.env.NODE_ENV === "production";
}

export function requireConfiguredSecret(
  envName: string,
  value: string | undefined,
): { ok: true } | { ok: false; response: NextResponse } {
  if (!isProductionRuntime()) {
    return { ok: true };
  }
  if (value?.trim()) {
    return { ok: true };
  }
  console.error(`[production] Missing required env: ${envName}`);
  return {
    ok: false,
    response: NextResponse.json(
      { error: `${envName} must be set in production` },
      { status: 503 },
    ),
  };
}

export function requireCronAuth(req: Request): { ok: true } | { ok: false; response: NextResponse } {
  const cronSecret = deploymentEnv("CRON_SECRET");
  const secretCheck = requireConfiguredSecret("CRON_SECRET", cronSecret);
  if (!secretCheck.ok) return secretCheck;

  const secret = cronSecret;
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return { ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return { ok: true };
}
