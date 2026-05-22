import { NextResponse } from "next/server";
import { getStudentFromCookies } from "@/lib/student-auth";
import { failPendingPayment } from "@/lib/cancel-pending-payment";
import { isValidObjectId } from "@/lib/object-id";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getStudentFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  if (!isValidObjectId(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const result = await failPendingPayment({
    paymentId: id,
    studentId: session.sub,
    organizationId: session.organizationId,
    reason: "user",
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ ok: true });
}
