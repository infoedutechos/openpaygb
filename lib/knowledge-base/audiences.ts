import { PlatformAudience } from "@prisma/client";
import type { PlatformHub } from "@/lib/knowledge-base/types";
import { hubToAudiences } from "@/lib/knowledge-base/types";

const VALID_AUDIENCES = new Set<string>(Object.values(PlatformAudience));

/** Prisma-safe audience list — omits enum values the generated client does not yet know (e.g. dex). */
export function prismaAudiencesForHub(hub: PlatformHub): PlatformAudience[] {
  const filtered = hubToAudiences(hub).filter((a): a is PlatformAudience => VALID_AUDIENCES.has(a));
  return filtered.length > 0 ? filtered : [PlatformAudience.all];
}
