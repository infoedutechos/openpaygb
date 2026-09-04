"use client";

import { OpenPayCardPanel } from "@/components/student/OpenPayCardPanel";

export default function StudentVirtualCardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">OpenPayGB Global Pay Card</h1>
        <p className="mt-2 text-sm text-slate-400">
          Your closed-loop OPGB card — top up, send to MoMo, and manage balance for tuition.
        </p>
      </div>
      <OpenPayCardPanel />
    </div>
  );
}
