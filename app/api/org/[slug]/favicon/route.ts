import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizeOrgSlug } from "@/lib/organization-intake";
import { orgFaviconContentType } from "@/lib/validate-org-favicon";

/** Public tenant favicon (school admin or master upload). Works for any org with bytes. */
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
        faviconIco: { not: null },
        faviconUploadedAt: { not: null },
      },
      select: { faviconIco: true, faviconUploadedAt: true },
    });

    if (!org?.faviconIco?.length || !org.faviconUploadedAt) {
      return NextResponse.json({ error: "No favicon" }, { status: 404 });
    }

    const buf = Buffer.from(org.faviconIco);
    const ctype = orgFaviconContentType(buf);
    const updated = Math.floor(org.faviconUploadedAt.getTime() / 1000).toString(16);

    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": ctype,
        "Cache-Control": "public, max-age=86400, immutable",
        ETag: `"org-favicon-${slug}-${updated}"`,
      },
    });
  } catch (e) {
    console.error("[org favicon GET]", e);
    return NextResponse.json({ error: "Unavailable" }, { status: 503 });
  }
}
