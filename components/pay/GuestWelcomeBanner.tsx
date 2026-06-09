"use client";

import { useEffect, useState } from "react";
import { buildWelcomeBackMessage } from "@/lib/welcome-back";
import { recordGuestCheckoutVisit } from "@/lib/guest-checkout-welcome";

type Props = {
  studentId: string;
  studentName: string;
  className?: string;
};

export function GuestWelcomeBanner({ studentId, studentName, className = "" }: Props) {
  const [previousLoginAt, setPreviousLoginAt] = useState<string | null>(null);

  useEffect(() => {
    setPreviousLoginAt(recordGuestCheckoutVisit(studentId));
  }, [studentId]);

  const name = studentName.trim();
  if (!name) return null;

  const { headline, subline } = buildWelcomeBackMessage({
    name,
    role: "guest",
    previousLoginAt,
    isFirstLogin: !previousLoginAt,
  });

  return (
    <div
      className={`rounded-xl border border-cyan-500/25 bg-cyan-950/25 px-4 py-3 text-left ${className}`}
      role="status"
    >
      <p className="text-sm font-semibold text-cyan-50">{headline}</p>
      <p className="mt-0.5 text-xs text-slate-400">{subline}</p>
    </div>
  );
}
