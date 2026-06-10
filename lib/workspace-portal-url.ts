/** Applicant-facing school workspace onboarding portal (verification status lives here). */
export function workspacePortalPath(opts: { slug: string; email?: string | null }) {
  const slug = opts.slug.trim().toLowerCase();
  const sp = new URLSearchParams();
  sp.set("slug", slug);
  const email = opts.email?.trim().toLowerCase();
  if (email) sp.set("email", email);
  return `/school/workspace-status?${sp.toString()}`;
}
