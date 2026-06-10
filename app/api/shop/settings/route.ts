import { NextResponse } from 'next/server';
import { getShopEnabled } from '@/utils/shop-settings';

import { apiErrorResponse } from "@/lib/api-error";
export const dynamic = 'force-dynamic';

/** Public: whether Shop is visible in the user app Market tab. */
export async function GET() {
  try {
  const shopEnabled = await getShopEnabled();
  return NextResponse.json({ shopEnabled }, {
    headers: { 'Cache-Control': 'no-store, max-age=0' },
  });

  } catch (e) {
    return apiErrorResponse(e, { route: "shop/settings/get", fallback: "Request failed" });
  }
}
