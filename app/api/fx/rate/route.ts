import { NextResponse } from "next/server";
import { getActiveUgxPerTon } from "@/lib/fx";
import { formatFxRateSource } from "@/lib/fx-rate-label";

export async function GET() {
  try {
  const r = await getActiveUgxPerTon();
  return NextResponse.json({
    ugxPerTon: r.ugxPerTon,
    source: r.source,
    sourceLabel: formatFxRateSource(r.source),
    pair: "TON/UGX",
    live:
      r.source === "coingecko" ||
      r.source === "cryptocompare" ||
      r.source === "tonapi" ||
      r.source.includes("usd_ugx") ||
      r.source.startsWith("market_median"),
    override:
      r.source === "platform_fixed" ||
      r.source === "org_fixed" ||
      r.source === "platform_buffer_pct" ||
      r.source === "org_buffer_pct",
  });
  } catch (e) {
    console.error("[fx/rate GET]", e);
    return NextResponse.json({ error: "Could not load FX rate" }, { status: 500 });
  }
}
