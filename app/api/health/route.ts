import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isProductionRuntime } from "@/lib/production-secrets";
import { deploymentEnv, warmDeploymentEnvCache } from "@/lib/deployment-env-resolve";

/**
 * Liveness / readiness.
 * - Unauthenticated: always 200 `{ ok: true }` when the process is up (UI / RSC / clicker ping).
 * - Bearer HEALTH_CHECK_SECRET (or no secret configured): include DB connectivity check.
 */
export async function GET(req: Request) {
  await warmDeploymentEnvCache();
  const healthSecret = deploymentEnv("HEALTH_CHECK_SECRET");
  const auth = req.headers.get("authorization");
  const authed = Boolean(healthSecret && auth === `Bearer ${healthSecret}`);
  const wantDeep = !healthSecret || authed || !isProductionRuntime();

  if (healthSecret && isProductionRuntime() && !authed) {
    // Public shallow health — do not 401 browser / footer / PointSynchronizer callers.
    return NextResponse.json({
      ok: true,
      mode: "public",
      db: "skipped",
    });
  }

  if (!wantDeep) {
    return NextResponse.json({ ok: true, mode: "public", db: "skipped" });
  }

  try {
    await prisma.$connect();
    return NextResponse.json({
      ok: true,
      mode: authed || !healthSecret ? "full" : "public",
      db: "connected",
    });
  } catch {
    return NextResponse.json(
      { ok: false, mode: "full", db: isProductionRuntime() ? "unavailable" : "error" },
      { status: 503 },
    );
  }
}
