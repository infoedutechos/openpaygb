import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api-error";
import { requireMaster } from "@/lib/master-session";
import { buildDemoLoginsExport, type DemoLoginsExportFormat } from "@/lib/demo-logins";

export const dynamic = "force-dynamic";

function parseFormat(raw: string | null): DemoLoginsExportFormat {
  if (raw === "csv" || raw === "md" || raw === "json") return raw;
  return "json";
}

export async function GET(req: Request) {
  try {
    const gate = await requireMaster();
    if (!gate.ok) return gate.response;

    const { searchParams } = new URL(req.url);
    const format = parseFormat(searchParams.get("format"));
    const file = await buildDemoLoginsExport(format);

    return new NextResponse(file.body, {
      status: 200,
      headers: {
        "Content-Type": file.contentType,
        "Content-Disposition": `attachment; filename="${file.filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    return apiErrorResponse(e, {
      route: "GET /api/master/demo-logins/export",
      fallback: "Could not export demo logins",
    });
  }
}
