import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizeOrgSlug } from "@/lib/organization-intake";
import { orgFaviconContentType } from "@/lib/validate-org-favicon";

/** Public school letterhead logo for receipts and share cards. */
export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug: raw } = await ctx.params;
  const slug = normalizeOrgSlug(raw ?? "");
  if (!slug) {
    return NextResponse.json({ error: "Invalid slug" }, { status: 400 });
  }

  try {
    const org = await prisma.organization.findFirst({
      where: {
        slug,
        letterheadLogo: { not: null },
        letterheadLogoUploadedAt: { not: null },
      },
      select: { letterheadLogo: true, letterheadLogoUploadedAt: true },
    });

    if (!org?.letterheadLogo?.length || !org.letterheadLogoUploadedAt) {
      return NextResponse.json({ error: "No letterhead logo" }, { status: 404 });
    }

    const buf = Buffer.from(org.letterheadLogo);
    const ctype = orgFaviconContentType(buf);
    const updated = Math.floor(org.letterheadLogoUploadedAt.getTime() / 1000).toString(16);

    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": ctype,
        "Cache-Control": "public, max-age=86400, immutable",
        ETag: `"org-letterhead-${slug}-${updated}"`,
      },
    });
  } catch (e) {
    console.error("[org letterhead-logo GET]", e);
    return NextResponse.json({ error: "Unavailable" }, { status: 503 });
  }
}
