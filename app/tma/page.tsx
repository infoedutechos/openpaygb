"use client";

import { Suspense } from "react";
import TmaApp from "@/components/tma/TmaApp";

export default function TmaPage() {
  return (
    <Suspense
      fallback={
        <div className="tma-root flex min-h-dvh items-center justify-center text-sm opacity-70">
          Starting Mini App…
        </div>
      }
    >
      <TmaApp />
    </Suspense>
  );
}
