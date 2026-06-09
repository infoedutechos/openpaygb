import { absoluteUrl } from "@/lib/public-url";

/** Map KB article slugs to in-app paths (relative or absolute). */
const SLUG_PATHS: Record<string, string> = {
  "tuition-pay-guest": "/pay",
  "tuition-student-portal": "/student/login",
  "school-admin-login": "/school/login",
  "workspace-registration": "/admin/register",
  "programme-fees-admin": "/admin/programmes",
  "master-admin-overview": "/admin/master",
  "student-signup-portal": "/student/register",
  "openpay-card-top-up": "/student/login",
  "play-clicker-overview": "/clicker",
  "ura-services-links": "/clicker",
  "platform-help-copilot": "/",
};

export function knowledgeArticleUrl(slug: string, orgSlug?: string): string | null {
  if (slug === "tuition-pay-guest" && orgSlug) {
    return absoluteUrl(`/pay/${orgSlug}`);
  }
  const path = SLUG_PATHS[slug];
  if (!path) return null;
  return absoluteUrl(path);
}

export function formatArticleLink(title: string, slug: string, orgSlug?: string): string {
  const url = knowledgeArticleUrl(slug, orgSlug);
  if (!url) return `**${title}**`;
  return `[${title}](${url})`;
}
