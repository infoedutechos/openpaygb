import { NextResponse } from "next/server";
import { z } from "zod";
import { requireMaster } from "@/lib/master-session";
import { upsertOrgAdminPassword } from "@/lib/upsert-org-admin-password";
import { apiErrorResponse } from "@/lib/api-error";

const Body = z.object({
  password: z.string().min(10).max(128),
  email: z.string().email().optional().or(z.literal("")),
  name: z.string().max(120).optional().default(""),
});

/** Create or reset the org admin password for one tenant. */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const gate = await requireMaster();
    if (!gate.ok) return gate.response;

    const { id } = await ctx.params;
    if (!id?.trim()) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const json = await req.json().catch(() => null);
    const parsed = Body.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid body", details: parsed.error.flatten() }, { status: 400 });
    }

    const result = await upsertOrgAdminPassword(id, {
      password: parsed.data.password,
      email: parsed.data.email || undefined,
      name: parsed.data.name || undefined,
    });

    return NextResponse.json({
      ...result,
      message: result.created
        ? `Org admin created for ${result.adminEmail}. They can sign in at /school/login.`
        : `Password updated for ${result.adminEmail}.`,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (
      msg.includes("not found") ||
      msg.includes("template") ||
      msg.includes("Provide an admin") ||
      msg.includes("master account") ||
      msg.includes("different organization") ||
      msg.includes("at least 10")
    ) {
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    return apiErrorResponse(e, {
      route: "POST /api/master/organizations/[id]/org-admin",
      fallback: "Could not set org admin password",
    });
  }
}
