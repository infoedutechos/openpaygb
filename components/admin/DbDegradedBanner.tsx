"use client";

import { DB_UNAVAILABLE_MESSAGE } from "@/lib/prisma-retry";

export function DbDegradedBanner() {
  return (
    <div
      role="status"
      className="border-b border-amber-500/30 bg-amber-950/40 px-4 py-2 text-center text-xs text-amber-100"
    >
      {DB_UNAVAILABLE_MESSAGE} Some lists and totals may be incomplete until the connection recovers.
    </div>
  );
}
