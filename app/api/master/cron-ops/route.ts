import { NextResponse } from "next/server";
import { z } from "zod";
import { apiErrorResponse } from "@/lib/api-error";
import { requireMaster } from "@/lib/master-session";
import { PLATFORM_CRON_JOBS } from "@/lib/cron-registry";
import { deploymentEnv } from "@/lib/deployment-env-resolve";
import { appBaseUrl } from "@/lib/root-metadata";

export async function GET() {
  try {
    const gate = await requireMaster();
    if (!gate.ok) return gate.response;

    const secretConfigured = Boolean(deploymentEnv("CRON_SECRET").trim());
    return NextResponse.json({
      secretConfigured,
      jobs: PLATFORM_CRON_JOBS,
      note: "Schedules mirror vercel.json. Run now invokes the cron route with CRON_SECRET from the server.",
    });
  } catch (e) {
    return apiErrorResponse(e, {
      route: "GET /api/master/cron-ops",
      fallback: "Could not load cron ops",
    });
  }
}

const RunBody = z.object({
  jobId: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    const gate = await requireMaster();
    if (!gate.ok) return gate.response;

    const json = await req.json().catch(() => null);
    const parsed = RunBody.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }

    const job = PLATFORM_CRON_JOBS.find((j) => j.id === parsed.data.jobId);
    if (!job) {
      return NextResponse.json({ error: "Unknown cron job" }, { status: 404 });
    }

    const secret = deploymentEnv("CRON_SECRET").trim();
    if (!secret) {
      return NextResponse.json(
        { error: "CRON_SECRET is not configured — set it in Deployment Environment first" },
        { status: 503 },
      );
    }

    const base = appBaseUrl();
    const url = `${base}${job.path}`;
    const started = Date.now();
    const res = await fetch(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${secret}` },
      cache: "no-store",
    });
    const text = await res.text();
    let body: unknown = text;
    try {
      body = JSON.parse(text);
    } catch {
      /* keep text */
    }

    return NextResponse.json({
      ok: res.ok,
      status: res.status,
      elapsedMs: Date.now() - started,
      jobId: job.id,
      path: job.path,
      body,
    });
  } catch (e) {
    return apiErrorResponse(e, {
      route: "POST /api/master/cron-ops",
      fallback: "Could not run cron job",
    });
  }
}
