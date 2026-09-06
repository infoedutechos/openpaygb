import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminFromCookies } from "@/lib/auth";
import { PLATFORM_SITE_UI_KEY } from "@/lib/site-ui-shared";
import { isProductLogoId, PRODUCT_LOGO_LABELS } from "@/lib/platform-brand";
import { productLogoFields, productLogoUrl } from "@/lib/product-logos";
import {
  platformLogoContentType,
  validatePlatformLogoBuffer,
} from "@/lib/validate-platform-logo";
import { apiErrorResponse } from "@/lib/api-error";

async function requireMaster() {
  const admin = await getAdminFromCookies();
  if (!admin || admin.role !== "master") return null;
  return admin;
}

async function resolveBodyBuffer(req: Request): Promise<{ ok: true; buf: Buffer } | { ok: false; error: string }> {
  const ct = req.headers.get("content-type") ?? "";
  if (ct.includes("multipart/form-data")) {
    const form = await req.formData().catch(() => null);
    if (!form) return { ok: false, error: "Invalid multipart body" };
    const file = form.get("file");
    if (!(file instanceof File)) {
      return { ok: false, error: 'Expected multipart field "file" with the logo.' };
    }
    return { ok: true, buf: Buffer.from(await file.arrayBuffer()) };
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

export async function POST(
  req: Request,
  ctx: { params: Promise<{ product: string }> },
) {
  try {
    if (!(await requireMaster())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { product: raw } = await ctx.params;
    if (!isProductLogoId(raw)) {
      return NextResponse.json({ error: "Unknown product" }, { status: 400 });
    }
    const body = await resolveBodyBuffer(req);
    if (!body.ok) {
      return NextResponse.json({ error: body.error }, { status: 400 });
    }
    const validated = validatePlatformLogoBuffer(body.buf);
    if (!validated.ok) {
      return NextResponse.json({ error: validated.reason }, { status: 400 });
    }

    const { bytesKey, atKey } = productLogoFields(raw);
    const uploadedAt = new Date();
    const bytes = new Uint8Array(body.buf);
    await prisma.siteUiSettings.upsert({
      where: { key: PLATFORM_SITE_UI_KEY },
      create: {
        key: PLATFORM_SITE_UI_KEY,
        [bytesKey]: bytes,
        [atKey]: uploadedAt,
      },
      update: {
        [bytesKey]: bytes,
        [atKey]: uploadedAt,
      },
    });

    return NextResponse.json({
      product: raw,
      label: PRODUCT_LOGO_LABELS[raw],
      hasLogo: true,
      publicUrl: productLogoUrl(raw, uploadedAt),
      uploadedAt: uploadedAt.toISOString(),
      contentType: platformLogoContentType(body.buf),
    });
  } catch (e) {
    return apiErrorResponse(e, { route: "POST /api/master/product-logos/[product]" });
  }
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ product: string }> },
) {
  try {
    if (!(await requireMaster())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { product: raw } = await ctx.params;
    if (!isProductLogoId(raw)) {
      return NextResponse.json({ error: "Unknown product" }, { status: 400 });
    }
    const { bytesKey, atKey } = productLogoFields(raw);
    await prisma.siteUiSettings.upsert({
      where: { key: PLATFORM_SITE_UI_KEY },
      create: { key: PLATFORM_SITE_UI_KEY },
      update: {
        [bytesKey]: null,
        [atKey]: null,
      },
    });
    return NextResponse.json({ ok: true, product: raw, hasLogo: false });
  } catch (e) {
    return apiErrorResponse(e, { route: "DELETE /api/master/product-logos/[product]" });
  }
}
