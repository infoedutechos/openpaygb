import { NextResponse } from 'next/server';
import { getAdminAuthError } from '@/utils/admin-session';
import { getShopEnabled, setShopEnabled } from '@/utils/shop-settings';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const authError = getAdminAuthError(req);
  if (authError) {
    return NextResponse.json(authError.body, { status: authError.status });
  }
  const shopEnabled = await getShopEnabled();
  return NextResponse.json({ shopEnabled });
}

export async function PATCH(req: Request) {
  const authError = getAdminAuthError(req);
  if (authError) {
    return NextResponse.json(authError.body, { status: authError.status });
  }
  const body = await req.json().catch(() => ({}));
  const enabled = body.enabled === true || body.enabled === 'true';
  await setShopEnabled(!!enabled);
  return NextResponse.json({ success: true, shopEnabled: !!enabled });
}
