import { NextResponse } from "next/server";
import { requireMaster } from "@/lib/master-session";
import { buildVercelEnvExport } from "@/lib/deployment-env-export";
import { apiErrorResponse } from "@/lib/api-error";

/** Master-only: download merged env as `.env` for Vercel import. */
export async function GET() {
  try {
    const gate = await requireMaster();
    if (!gate.ok) return gate.response;

    const body = await buildVercelEnvExport();
    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": 'attachment; filename="odelhub-vercel.env"',
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    return apiErrorResponse(e, { route: "GET /api/master/deployment-env/export" });
  }
}
