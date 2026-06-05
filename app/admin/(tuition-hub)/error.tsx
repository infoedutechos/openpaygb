"use client";

import { useEffect } from "react";
import Link from "next/link";
import { isTransientMongoError } from "@/lib/prisma-retry";

export default function TuitionHubError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[admin/tuition-hub/error]", error);
  }, [error]);

  const dbHint = isTransientMongoError(error);

  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center text-slate-200">
      <h1 className="text-lg font-semibold text-white">Tuition admin error</h1>
      <p className="mt-2 text-sm text-slate-400">
        {dbHint
          ? "The database connection dropped. Refresh when Atlas is reachable."
          : "Something went wrong loading this admin page."}
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="rounded-xl bg-cyan-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-cyan-500"
        >
          Try again
        </button>
        <Link href="/admin" className="rounded-xl border border-white/20 px-5 py-2.5 text-sm font-semibold hover:bg-white/5">
          Dashboard
        </Link>
      </div>
    </div>
  );
}
