import { checkoutAuthHeaders } from "@/utils/checkout-session-client";

export async function cancelCheckoutPayment(opts: {
  paymentId: string;
  organizationSlug: string;
  studentId: string;
}): Promise<{ ok: boolean; error?: string }> {
  const r = await fetch(`/api/public/checkout/payment/${encodeURIComponent(opts.paymentId)}/cancel`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...checkoutAuthHeaders(opts.organizationSlug),
    },
    body: JSON.stringify({
      organizationSlug: opts.organizationSlug,
      studentId: opts.studentId,
    }),
  });
  const j = (await r.json()) as { error?: string };
  if (!r.ok) return { ok: false, error: j.error ?? "Could not cancel payment" };
  return { ok: true };
}

export async function cancelStudentPayment(paymentId: string): Promise<{ ok: boolean; error?: string }> {
  const r = await fetch(`/api/student/payments/${encodeURIComponent(paymentId)}/cancel`, {
    method: "POST",
    credentials: "include",
  });
  const j = (await r.json()) as { error?: string };
  if (!r.ok) return { ok: false, error: j.error ?? "Could not cancel payment" };
  return { ok: true };
}
