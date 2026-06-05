/**
 * Strip HTML from third-party payment instructions before display (Mbiyo / PSP copy).
 */
export function sanitizeProviderInstructions(raw: string): string {
  const s = raw.trim();
  if (!s) return "";
  return s
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/javascript:/gi, "")
    .replace(/on\w+\s*=/gi, "")
    .trim();
}
