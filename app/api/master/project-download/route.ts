import { NextResponse } from "next/server";
import { requireMaster } from "@/lib/master-session";
import { apiErrorResponse } from "@/lib/api-error";
import { buildProjectDownload, type ProjectDownloadPart } from "@/lib/master-project-download";

const PARTS = new Set<ProjectDownloadPart>([
  "full",
  "tuition",
  "organizations",
  "programmes",
  "payments",
  "master-admins",
  "env",
  "knowledge-base",
  "notifications",
  "source",
]);

/** Master Admin: download full project bundle or partial exports. */
export async function GET(req: Request) {
  try {
    const gate = await requireMaster();
    if (!gate.ok) return gate.response;

    const part = (new URL(req.url).searchParams.get("part") ?? "full").trim().toLowerCase() as ProjectDownloadPart;
    if (!PARTS.has(part)) {
      return NextResponse.json(
        { error: "Invalid part", allowed: [...PARTS] },
        { status: 400 },
      );
    }

    const payload = await buildProjectDownload(part);
    const body =
      typeof payload.body === "string" ? payload.body : new Uint8Array(payload.body);

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": payload.contentType,
        "Content-Disposition": `attachment; filename="${payload.filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    return apiErrorResponse(e, { route: "GET /api/master/project-download" });
  }
}
