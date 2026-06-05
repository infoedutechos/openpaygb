import { getAdminFromCookies } from "@/lib/auth";
import { canAccessConfirmedReceipt } from "@/lib/receipt-access";
import { getStudentFromCookies } from "@/lib/student-auth";

export async function receiptAccessFromRequest(
  payment: { id: string; studentId: string; status: string; confirmedAt: Date | null },
  req: Request,
): Promise<boolean> {
  const url = new URL(req.url);
  const token = url.searchParams.get("t");
  const [admin, student] = await Promise.all([getAdminFromCookies(), getStudentFromCookies()]);
  return canAccessConfirmedReceipt({
    payment,
    token,
    isAdmin: Boolean(admin),
    studentUserId: student?.sub ?? null,
  });
}
