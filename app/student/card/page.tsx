"use client";

import { OpenPayCardPanel } from "@/components/student/OpenPayCardPanel";
import { OPEN_PAY_BRAND, PAYMENT_RAIL_OPENPAY_CARD } from "@/lib/open-pay-brand";

export default function StudentVirtualCardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">OpenPayGB Card</h1>
        <p className="mt-2 text-sm text-slate-400">
          Manage your {PAYMENT_RAIL_OPENPAY_CARD} ({OPEN_PAY_BRAND}) — reserve, activate with Mobile Money or TON, and top
          up for tuition payments.
        </p>
      </div>
      <OpenPayCardPanel />
    </div>
  );
}
