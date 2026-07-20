import "server-only";

import { getAdminFromCookies } from "@/lib/auth";
import {
  ensureAdminOpenPayHolder,
  organizationSlugFromRequest,
} from "@/lib/admin-openpay-holder";

/** Authenticate admin and resolve personal OpenPayGB card holder (supports master orgSlug). */
export async function requireAdminOpenPayHolder(req?: Request) {
  const session = await getAdminFromCookies();
  if (!session) return { ok: false as const, status: 401 as const, error: "Unauthorized" };

  const organizationSlug = req ? organizationSlugFromRequest(req) : null;
  try {
    const holder = await ensureAdminOpenPayHolder(session.sub, { organizationSlug });
    return { ok: true as const, session, holder };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not resolve card holder";
    return { ok: false as const, status: 400 as const, error: msg };
  }
}
