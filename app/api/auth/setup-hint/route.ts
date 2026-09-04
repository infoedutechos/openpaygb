import { NextResponse } from "next/server";

/** Dev-only: which email/password env vars the server uses for tuition admin seed/ensure. */
export async function GET() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const email = (process.env.SEED_ADMIN_EMAIL ?? "admin@odelhub.local").trim().toLowerCase();
  const uwaisEmail = (process.env.SEED_UWAIS_ADMIN_EMAIL ?? "uwais.admin@odelhub.local").trim().toLowerCase();
  return NextResponse.json({
    email,
    uwaisEmail,
    note: "Master password: SEED_ADMIN_PASSWORD. Uwais: run npm run seed:uwais and use the password printed (SEED_UWAIS_ADMIN_PASSWORD or SEED_ADMIN_PASSWORD).",
  });
}
