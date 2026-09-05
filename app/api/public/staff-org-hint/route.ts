import { NextResponse } from "next/server";
import { clientIp, rateLimitHit } from "@/lib/rate-limit";
import { institutionTierFromSegmentParam } from "@/lib/institution-tier";
import { findStaffByCodeAcrossOrgs } from "@/lib/staff-login-resolve";
import { apiErrorResponse } from "@/lib/api-error";

/**
 * Public hint: given Staff ID (+ optional segment), return the unique matching school/institution.
 * Used to auto-fill the institution field on /staff/login.
 */
export async function GET(req: Request) {
  try {
    const ip = clientIp(req);
    if (rateLimitHit(`staff-org-hint:${ip}`, 60, 15 * 60 * 1000)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const url = new URL(req.url);
    const staffCode = (url.searchParams.get("staffCode") ?? "").trim().toUpperCase();
    if (staffCode.length < 3) {
      return NextResponse.json({ match: null });
    }

    const tier =
      institutionTierFromSegmentParam(url.searchParams.get("segment")) ??
      (() => {
        const t = url.searchParams.get("tier")?.trim().toLowerCase();
        return t === "school" || t === "university" ? t : null;
      })();

    const matches = await findStaffByCodeAcrossOrgs({
      staffCode,
      institutionTier: tier,
    });

    if (matches.length !== 1) {
      return NextResponse.json({ match: null, ambiguous: matches.length > 1 });
    }

    const m = matches[0]!;
    return NextResponse.json({
      match: {
        organizationSlug: m.organizationSlug,
        organizationName: m.organizationName,
        staffName: m.name,
        staffCode: m.staffCode,
      },
    });
  } catch (e) {
    return apiErrorResponse(e, { route: "GET /api/public/staff-org-hint" });
  }
}
