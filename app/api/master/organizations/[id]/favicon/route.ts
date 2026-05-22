import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMaster } from "@/lib/master-session";
import {
  orgFaviconContentType,
  validateOrgFaviconBuffer,
} from "@/lib/validate-org-favicon";

async function resolveBodyBuffer(req: Request): Promise<{ ok: true; buf: Buffer } | { ok: false; error: string }> {
  const ct = req.headers.get("content-type") ?? "";

  if (ct.includes("multipart/form-data")) {
    const form = await req.formData().catch(() => null);
    if (!form) return { ok: false, error: "Invalid multipart body" };
    const file = form.get("file");
    if (!(file instanceof File)) {
      return { ok: false, error: 'Expected multipart field "file" with the favicon.' };
    }
    const buf = Buffer.from(await file.arrayBuffer());
    return { ok: true, buf };
  }

  if (ct.includes("application/octet-stream")) {
    const ab = await req.arrayBuffer().catch(() => null);
    if (!ab) return { ok: false, error: "Empty body" };
    return { ok: true, buf: Buffer.from(ab) };
  }

  return {
    ok: false,
    error: "Use multipart form field \"file\", or Content-Type application/octet-stream.",
  };
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const gate = await requireMaster();
  if (!gate.ok) return gate.response;

  const { id } = await ctx.params;
  if (!id?.trim()) {
    return NextResponse.json({ error: "Missing organization id" }, { status: 400 });
  }

  const org = await prisma.organization.findUnique({ where: { id }, select: { id: true, slug: true } });
  if (!org) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  const body = await resolveBodyBuffer(req);
  if (!body.ok) {
    return NextResponse.json({ error: body.error }, { status: 400 });
  }

  const validated = validateOrgFaviconBuffer(body.buf);
  if (!validated.ok) {
    return NextResponse.json({ error: validated.reason }, { status: 400 });
  }

  try {
    const bytes = new Uint8Array(body.buf);
    const updated = await prisma.organization.update({
      where: { id },
      data: {
        faviconIco: bytes,
        faviconUploadedAt: new Date(),
      },
      select: { slug: true, faviconUploadedAt: true },
    });

    const contentType = orgFaviconContentType(body.buf);
    return NextResponse.json({
      slug: updated.slug,
      faviconUploadedAt: updated.faviconUploadedAt?.toISOString() ?? null,
      publicUrl: `/api/org/${encodeURIComponent(updated.slug)}/favicon`,
      contentType,
    });
  } catch (e) {
    console.error("[master/organizations favicon POST]", e);
    return NextResponse.json({ error: "Could not save favicon" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const gate = await requireMaster();
  if (!gate.ok) return gate.response;

  const { id } = await ctx.params;
  if (!id?.trim()) {
    return NextResponse.json({ error: "Missing organization id" }, { status: 400 });
  }

  try {
    await prisma.organization.update({
      where: { id },
      data: { faviconIco: null, faviconUploadedAt: null },
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }
}
