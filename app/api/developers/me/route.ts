import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api-error";
import { requireDeveloperSession } from "@/lib/developer-auth";

export async function GET() {
  try {
    const gate = await requireDeveloperSession();
    if (!gate.ok) return gate.response;
    return NextResponse.json({ app: gate.app });
  } catch (e) {
    return apiErrorResponse(e, { route: "GET /api/developers/me" });
  }
}
