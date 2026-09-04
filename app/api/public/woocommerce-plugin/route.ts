import { NextResponse } from "next/server";
import {
  buildWooCommercePluginZip,
  getWooCommercePluginMeta,
} from "@/lib/woocommerce-plugin-download";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Public installable WooCommerce plugin zip (+ JSON meta with ?format=json). */
export async function GET(req: Request) {
  const url = new URL(req.url);
  if (url.searchParams.get("format") === "json") {
    return NextResponse.json(getWooCommercePluginMeta(), {
      headers: { "Cache-Control": "no-store" },
    });
  }

  try {
    const { body, contentType, filename } = await buildWooCommercePluginZip();
    return new NextResponse(new Uint8Array(body), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "public, max-age=300",
        "Content-Length": String(body.length),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Plugin package unavailable";
    return NextResponse.json({ error: message }, { status: 404 });
  }
}
