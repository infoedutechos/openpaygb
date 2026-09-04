import "server-only";

import { readDeveloperSessionFromCookies } from "@/lib/developer-session";
import { ensureDeveloperOpenPayHolder } from "@/lib/developer-openpay-holder";

/** Authenticate developer app session and resolve personal OpenPayGB card holder. */
export async function requireDeveloperOpenPayHolder() {
  const session = await readDeveloperSessionFromCookies();
  if (!session) {
    return { ok: false as const, status: 401 as const, error: "Developer sign-in required" };
  }

  try {
    const holder = await ensureDeveloperOpenPayHolder(session.appId);
    return { ok: true as const, session, holder };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not resolve card holder";
    return { ok: false as const, status: 400 as const, error: msg };
  }
}
