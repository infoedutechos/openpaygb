"use client";

import { PaymentRequestPanel } from "@/components/admin/PaymentRequestPanel";

export default function AdminPaymentRequestsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Payment requests</h1>
        <p className="mt-2 max-w-xl text-sm text-slate-400">
          Request money from students and parents via secure checkout links.
        </p>
      </div>
      <PaymentRequestPanel />
    </div>
  );
}
