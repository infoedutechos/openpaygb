import { revalidateTag } from "next/cache";

/** Call after org tenant status / slug / checkout settings change. */
export function revalidateOrganizationCaches(slug?: string, organizationId?: string) {
  try {
    revalidateTag("organizations");
    const s = slug?.trim().toLowerCase();
    if (s) revalidateTag(`org:${s}`);
    const oid = organizationId?.trim();
    if (oid) revalidateTag(`programmes:${oid}`);
  } catch {
    /* Vitest / scripts run outside Next static generation store */
  }
}
