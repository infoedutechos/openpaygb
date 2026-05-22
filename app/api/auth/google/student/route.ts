import { NextResponse } from "next/server";
import {
  buildGoogleAuthUrl,
  COOKIE_GOAUTH_INTENT,
  COOKIE_GOAUTH_STATE,
  getGoogleOAuthRedirectUri,
  newGoogleOAuthState,
} from "@/lib/google-oauth-student";

/**
 * Starts Google OAuth for the student portal (`intent=register` or `intent=login`).
 * Configure **Authorized redirect URI** in Google Cloud Console: `{origin}/api/auth/google/student/callback`
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const intent = url.searchParams.get("intent");
  if (intent !== "register" && intent !== "login") {
    return NextResponse.json({ error: "Use intent=register or intent=login" }, { status: 400 });
  }

  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  if (!clientId) {
    const path = intent === "login" ? "/student/login" : "/student/register";
    const u = new URL(path, url.origin);
    u.searchParams.set(
      "error",
      "Google sign-in is not configured yet. Ask your administrator to set GOOGLE_CLIENT_ID."
    );
    return NextResponse.redirect(u.toString());
  }

  const origin = (process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || url.origin).trim();
  const redirectUri = getGoogleOAuthRedirectUri(origin);
  const state = newGoogleOAuthState();
  const authUrl = buildGoogleAuthUrl({ clientId, redirectUri, state });

  const secure = process.env.NODE_ENV === "production";
  const cookieBase = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure,
    path: "/",
    maxAge: 600,
  };

  const res = NextResponse.redirect(authUrl);
  res.cookies.set(COOKIE_GOAUTH_STATE, state, cookieBase);
  res.cookies.set(COOKIE_GOAUTH_INTENT, intent, cookieBase);
  return res;
}
