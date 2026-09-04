import { NextResponse } from "next/server";
import { getOpgbFxSnapshot } from "@/lib/opgb-fx-rates";
import { apiErrorResponse } from "@/lib/api-error";

/** Public OPGB cost-estimator rates (1 OPGB = 1 UGX). */
export async function GET() {
  try {
    const fx = await getOpgbFxSnapshot();
    return NextResponse.json({
      peg: { opgbPerUgx: 1, note: "1 OPGB = 1 UGX" },
      ugxPerUsd: fx.ugxPerUsdt,
      ugxPerUsdt: fx.ugxPerUsdt,
      ugxPerTon: fx.ugxPerTon,
      source: fx.source,
      fetchedAt: fx.fetchedAt,
    });
  } catch (e) {
    return apiErrorResponse(e, { route: "GET /api/public/opgb-fx" });
  }
}
