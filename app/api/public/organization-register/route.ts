import { NextResponse } from "next/server";
import { clientIp, rateLimitHit } from "@/lib/rate-limit";
import { pendingOrgBodySchema, createPendingOrganization } from "@/lib/organization-intake";

export async function POST(req: Request) {
  try {
    const ip = clientIp(req);
    if (rateLimitHit(`org-register:${ip}`, 5, 60 * 60 * 1000)) {
      return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 });
    }

    const json = await req.json().catch(() => null);
    const parsed = pendingOrgBodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid body", details: parsed.error.flatten() }, { status: 400 });
    }

    const org = await createPendingOrganization(parsed.data);
    return NextResponse.json(
      {
        organization: {
          id: org.id,
          name: org.name,
          slug: org.slug,
          tenantStatus: org.tenantStatus,
        },
        message:
          "Request received. A platform administrator will review and approve your workspace, then create your school admin login (email and password). You will sign in at /school/login when they share those credentials.",
      },
      { status: 201 }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not register";
    if (msg.includes("already in use")) {
      return NextResponse.json({ error: msg }, { status: 409 });
    }
    console.error("[organization-register]", e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
