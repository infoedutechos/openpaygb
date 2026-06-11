import { NextResponse } from "next/server";
import { getSchoolWorkspaceRegistrationPolicy } from "@/lib/school-workspace-registration-policy";

/** Public read of whether self-serve school registration requires master approval. */
export async function GET() {
  const policy = await getSchoolWorkspaceRegistrationPolicy();
  return NextResponse.json({
    ...policy,
    /** Set on Vercel builds — use to confirm production picked up a new deploy. */
    buildSha: process.env.VERCEL_GIT_COMMIT_SHA?.trim() || null,
  });
}
