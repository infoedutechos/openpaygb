import { NextResponse } from 'next/server';
import { getAdminAuthError } from '@/utils/admin-session';
import { getShopEnabled, setShopEnabled } from '@/utils/shop-settings';

import { apiErrorResponse } from "@/lib/api-error";
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
  const authError = getAdminAuthError(req);
  if (authError) {
    return NextResponse.json(authError.body, { status: authError.status });
  }
  const shopEnabled = await getShopEnabled();
  return NextResponse.json({ shopEnabled });

  } catch (e) {
    return apiErrorResponse(e, { route: "admin/shop/settings/get", fallback: "Request failed" });
  }
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
