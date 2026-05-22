import { NextResponse } from "next/server";

/** Dev-only: which email/password env vars the server uses for tuition admin seed/ensure. */
export async function GET() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const email = (process.env.SEED_ADMIN_EMAIL ?? "admin@odelhub.local").trim().toLowerCase();
  return NextResponse.json({
    email,
    note: "Password is SEED_ADMIN_PASSWORD from .env.local (overrides .env). Run npm run admin:ensure to create or reset the admin without wiping data.",
  });
}
