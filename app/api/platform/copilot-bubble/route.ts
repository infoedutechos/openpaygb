import { NextResponse } from "next/server";
import { getCopilotBubbleImageRecord } from "@/lib/copilot-bubble-image";

/** Public Help copilot bubble image (master upload). */
export async function GET() {
  try {
    const { bytes, uploadedAt, contentType } = await getCopilotBubbleImageRecord();
    if (!bytes?.length || !uploadedAt || !contentType) {
      return NextResponse.json({ error: "No copilot bubble image" }, { status: 404 });
    }

    const updated = Math.floor(uploadedAt.getTime() / 1000).toString(16);
    return new NextResponse(new Uint8Array(bytes), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, immutable",
        ETag: `"copilot-bubble-${updated}"`,
      },
    });
  } catch (e) {
    console.error("[platform copilot-bubble GET]", e);
    return NextResponse.json({ error: "Unavailable" }, { status: 503 });
  }
}
