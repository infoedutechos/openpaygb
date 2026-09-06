/**
 * AssessmentVerse OS — independent assessment product (not OdelPay).
 * Public lobby on this hub: /AssessmentVerseOS
 * Live OS when configured via NEXT_PUBLIC_ASSESSMENTVERSE_URL (otherwise local defaults for operators).
 */

function isLoopbackHost(url: string): boolean {
  try {
    const u = new URL(url);
    return u.hostname === "127.0.0.1" || u.hostname === "localhost" || u.hostname === "[::1]";
  } catch {
    return /127\.0\.0\.1|localhost/i.test(url);
  }
}

export function assessmentVerseUrls() {
  const ui = String(process.env.NEXT_PUBLIC_ASSESSMENTVERSE_URL || "http://127.0.0.1:5000/").replace(
    /\/?$/,
    "/",
  );
  const api = String(
    process.env.NEXT_PUBLIC_ASSESSMENTVERSE_API_URL || ui.replace(/:5000\/?$/, ":5001/"),
  ).replace(/\/?$/, "/");
  return {
    ui,
    api,
    login: `${ui}login`,
    schools: `${ui}schools`,
    higher: `${ui}higher`,
    /** True when pointing at loopback — not for public marketing CTAs. */
    isLocalDefault: isLoopbackHost(ui),
  };
}
