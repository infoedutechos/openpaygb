import { NextResponse } from "next/server";
import { getSchoolWorkspaceRegistrationPolicy } from "@/lib/school-workspace-registration-policy";

/** Public read of whether self-serve school registration requires master approval. */
export async function GET() {
  const policy = await getSchoolWorkspaceRegistrationPolicy();
  return NextResponse.json(policy);
}
