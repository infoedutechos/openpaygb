import { NextRequest, NextResponse } from "next/server";
import { buildTonConnectManifest } from "@/lib/tonconnect-manifest-body";
import { resolveTonConnectOrigin } from "@/lib/tonconnect-request-origin";

/** TON Connect manifest — `url` must match the host that serves this request (see TON Wallet help). */
export async function GET(req: NextRequest) {
  const origin = resolveTonConnectOrigin(req);
  const manifest = buildTonConnectManifest(origin);

  return NextResponse.json(manifest, {
    headers: {
      "Cache-Control": "public, max-age=300",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
