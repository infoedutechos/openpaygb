/** Applicant-facing school workspace onboarding portal (verification status lives here). */
export function workspacePortalPath(opts: {
  slug: string;
  email?: string | null;
  extra?: Record<string, string>;
}) {
  const slug = opts.slug.trim().toLowerCase();
  const sp = new URLSearchParams();
  sp.set("slug", slug);
  const email = opts.email?.trim().toLowerCase();
  if (email) sp.set("email", email);
  if (opts.extra) {
    for (const [k, v] of Object.entries(opts.extra)) {
      if (v) sp.set(k, v);
    }
  }
  return `/school/workspace-status?${sp.toString()}`;
}
