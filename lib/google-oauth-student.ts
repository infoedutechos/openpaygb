import { randomBytes } from "node:crypto";

export const COOKIE_GOAUTH_STATE = "odelhub_goauth_state";
export const COOKIE_GOAUTH_INTENT = "odelhub_goauth_intent";

export function getGoogleOAuthRedirectUri(origin: string): string {
  return `${origin.replace(/\/$/, "")}/api/auth/google/student/callback`;
}

export function buildGoogleAuthUrl(params: { clientId: string; redirectUri: string; state: string }): string {
  const u = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  u.searchParams.set("client_id", params.clientId);
  u.searchParams.set("redirect_uri", params.redirectUri);
  u.searchParams.set("response_type", "code");
  u.searchParams.set("scope", "openid email profile");
  u.searchParams.set("state", params.state);
  u.searchParams.set("prompt", "select_account");
  return u.toString();
}

export async function exchangeGoogleCode(
  code: string,
  redirectUri: string
): Promise<{ access_token: string } | null> {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) return null;

  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  });

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!res.ok) return null;
  const j = (await res.json()) as { access_token?: string };
  return j.access_token ? { access_token: j.access_token } : null;
}

export async function fetchGoogleUserInfo(
  accessToken: string
): Promise<{ sub: string; email: string; name: string } | null> {
  const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return null;
  const j = (await res.json()) as { sub?: string; email?: string; name?: string };
  if (!j.sub || !j.email) return null;
  const name = (j.name?.trim() || j.email.split("@")[0] || "Student").slice(0, 120);
  return { sub: j.sub, email: j.email.trim().toLowerCase(), name };
}

export function newGoogleOAuthState(): string {
  return randomBytes(24).toString("hex");
}
