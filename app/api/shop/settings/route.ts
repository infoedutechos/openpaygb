import { NextResponse } from 'next/server';
import { getShopEnabled } from '@/utils/shop-settings';

export const dynamic = 'force-dynamic';

/** Public: whether Shop is visible in the user app Market tab. */
export async function GET() {
  const shopEnabled = await getShopEnabled();
  return NextResponse.json({ shopEnabled }, {
    headers: { 'Cache-Control': 'no-store, max-age=0' },
  });
}
