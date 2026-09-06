import { NextResponse } from "next/server";
import { getAdminFromCookies } from "@/lib/auth";
import { getProductLogoStatus } from "@/lib/product-logos";
import { apiErrorResponse } from "@/lib/api-error";

async function requireMaster() {
  const admin = await getAdminFromCookies();
  if (!admin || admin.role !== "master") return null;
  return admin;
}

export async function GET() {
  try {
    if (!(await requireMaster())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const logos = await getProductLogoStatus();
    return NextResponse.json({ logos });
  } catch (e) {
    return apiErrorResponse(e, { route: "GET /api/master/product-logos" });
  }
}
