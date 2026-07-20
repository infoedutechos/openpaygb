import "server-only";

import { getStaffFromCookies } from "@/lib/staff-auth";
import { ensureStaffOpenPayHolder } from "@/lib/staff-openpay-holder";

/** Authenticate staff portal session and resolve personal OpenPayGB card holder. */
export async function requireStaffOpenPayHolder() {
  const session = await getStaffFromCookies();
  if (!session) return { ok: false as const, status: 401 as const, error: "Unauthorized" };

  try {
    const holder = await ensureStaffOpenPayHolder(session.sub);
    if (holder.organizationId !== session.organizationId) {
      return { ok: false as const, status: 403 as const, error: "Organization mismatch" };
    }
    return { ok: true as const, session, holder };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not resolve card holder";
    return { ok: false as const, status: 400 as const, error: msg };
  }
}
