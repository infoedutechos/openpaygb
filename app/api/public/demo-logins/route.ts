import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api-error";
import { listPublicDemoLogins, type DemoLoginAudience } from "@/lib/demo-logins";

export const dynamic = "force-dynamic";

function parseAudience(raw: string | null): DemoLoginAudience | "all" {
  if (raw === "school" || raw === "university" || raw === "platform") return raw;
  return "all";
}

/**
 * Public demo login directory for Schools / Universities lobbies and login hints.
 * Only slots with publishPublic=true are returned. Password hashes are never exposed —
 * optional passwordHint only when master explicitly published one in MAC.
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const audience = parseAudience(searchParams.get("audience"));
    const slots = await listPublicDemoLogins({ audience });
    return NextResponse.json(
      {
        slots,
        updatedFrom: "Master Admin Console → Demo logins",
        manageHref: "/admin/master#demo-logins",
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (e) {
    return apiErrorResponse(e, {
      route: "GET /api/public/demo-logins",
      fallback: "Could not load demo logins",
    });
  }
}
