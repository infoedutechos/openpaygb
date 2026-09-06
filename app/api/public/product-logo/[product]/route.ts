import { NextResponse } from "next/server";
import { isProductLogoId } from "@/lib/platform-brand";
import { getProductLogoRecord } from "@/lib/product-logos";
import { apiErrorResponse } from "@/lib/api-error";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ product: string }> },
) {
  try {
    const { product: raw } = await ctx.params;
    if (!isProductLogoId(raw)) {
      return NextResponse.json({ error: "Unknown product" }, { status: 404 });
    }
    if (raw === "hub") {
      return NextResponse.redirect(new URL("/api/platform/logo", req.url));
    }
    const { bytes, uploadedAt, contentType } = await getProductLogoRecord(raw);
    if (!bytes?.length || !uploadedAt || !contentType) {
      return NextResponse.json({ error: "No logo" }, { status: 404 });
    }
    const updated = Math.floor(uploadedAt.getTime() / 1000).toString(16);
    return new NextResponse(new Uint8Array(bytes), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, immutable",
        ETag: `"product-logo-${raw}-${updated}"`,
      },
    });
  } catch (e) {
    return apiErrorResponse(e, { route: "GET /api/public/product-logo/[product]" });
  }
}
