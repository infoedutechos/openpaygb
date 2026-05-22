const missingActiveOrgSlug = new Set<string>();

/** Avoid spamming the dev console on every RSC refresh when DB has no active tenant for a slug. */
export function warnPayOrgMissingActiveOnce(slug: string, line: string): void {
  const key = slug.toLowerCase();
  if (missingActiveOrgSlug.has(key)) return;
  missingActiveOrgSlug.add(key);
  console.warn(line);
}
