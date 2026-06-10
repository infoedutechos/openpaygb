import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminFromCookies } from "@/lib/auth";
import { revalidateAdminProfile } from "@/lib/cached-admin-profile";
import { apiErrorResponse } from "@/lib/api-error";
import {
  platformLogoContentType,
  validatePlatformLogoBuffer,
} from "@/lib/validate-platform-logo";

async function resolveBodyBuffer(req: Request): Promise<{ ok: true; buf: Buffer } | { ok: false; error: string }> {
  const ct = req.headers.get("content-type") ?? "";

  if (ct.includes("multipart/form-data")) {
    const form = await req.formData().catch(() => null);
    if (!form) return { ok: false, error: "Invalid multipart body" };
    const file = form.get("file");
    if (!(file instanceof File)) {
      return { ok: false, error: 'Expected multipart field "file" with the image.' };
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
    error: 'Use multipart form field "file", or Content-Type application/octet-stream.',
  };
}

export async function GET(req: Request) {
  try {
    const session = await getAdminFromCookies();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = await prisma.adminUser.findUnique({
      where: { id: session.sub },
      select: { profileImage: true, profileImageUploadedAt: true },
    });

    if (!admin?.profileImage?.length || !admin.profileImageUploadedAt) {
      return NextResponse.json({ error: "No profile image" }, { status: 404 });
    }

    const buf = Buffer.from(admin.profileImage);
    const ctype = platformLogoContentType(buf);
    const updated = Math.floor(admin.profileImageUploadedAt.getTime() / 1000).toString(16);
    const url = new URL(req.url);
    const v = url.searchParams.get("v");

    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": ctype,
        "Cache-Control": "private, max-age=3600",
        ETag: `"admin-profile-${session.sub}-${updated}${v ? `-${v}` : ""}"`,
      },
    });
  } catch (e) {
    return apiErrorResponse(e, { route: "auth/admin/profile-image GET", fallback: "Unavailable" });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getAdminFromCookies();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await resolveBodyBuffer(req);
    if (!body.ok) {
      return NextResponse.json({ error: body.error }, { status: 400 });
    }

    const validated = validatePlatformLogoBuffer(body.buf);
    if (!validated.ok) {
      return NextResponse.json({ error: validated.reason }, { status: 400 });
    }

    const bytes = new Uint8Array(body.buf);
    const updated = await prisma.adminUser.update({
      where: { id: session.sub },
      data: {
        profileImage: bytes,
        profileImageUploadedAt: new Date(),
      },
      select: { profileImageUploadedAt: true },
    });

    revalidateAdminProfile(session.sub);

    const profileImageUrl = `/api/auth/admin/profile-image?v=${updated.profileImageUploadedAt?.getTime() ?? Date.now()}`;
    return NextResponse.json({
      profileImageUrl,
      profileImageUploadedAt: updated.profileImageUploadedAt?.toISOString() ?? null,
      contentType: platformLogoContentType(body.buf),
    });
  } catch (e) {
    return apiErrorResponse(e, { route: "auth/admin/profile-image POST", fallback: "Could not save image" });
  }
}

export async function DELETE() {
  try {
    const session = await getAdminFromCookies();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await prisma.adminUser.update({
      where: { id: session.sub },
      data: {
        profileImage: null,
        profileImageUploadedAt: null,
      },
    });

    revalidateAdminProfile(session.sub);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiErrorResponse(e, { route: "auth/admin/profile-image DELETE", fallback: "Could not remove image" });
  }
}
