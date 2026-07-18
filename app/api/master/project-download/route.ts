import { NextResponse } from "next/server";
import { requireMaster } from "@/lib/master-session";
import { apiErrorResponse } from "@/lib/api-error";
import {
  PROJECT_DOWNLOAD_CATALOGUE,
  PROJECT_DOWNLOAD_PART_IDS,
  isProjectDownloadPart,
} from "@/lib/master-download-catalogue";
import { buildProjectDownload } from "@/lib/master-project-download";

/** Master Admin: download full project bundle, category ZIP, or partial exports. */
export async function GET(req: Request) {
  try {
    const gate = await requireMaster();
    if (!gate.ok) return gate.response;

    const url = new URL(req.url);
    if (url.searchParams.get("catalogue") === "1") {
      return NextResponse.json({
        catalogue: PROJECT_DOWNLOAD_CATALOGUE,
        parts: PROJECT_DOWNLOAD_PART_IDS,
      });
    }

    const partRaw = (url.searchParams.get("part") ?? "full").trim().toLowerCase();
    if (!isProjectDownloadPart(partRaw)) {
      return NextResponse.json(
        { error: "Invalid part", allowed: [...PROJECT_DOWNLOAD_PART_IDS] },
        { status: 400 },
      );
    }

    const payload = await buildProjectDownload(partRaw);
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
