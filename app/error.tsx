"use client";

import { useEffect } from "react";
import Link from "next/link";
import { isTransientMongoError } from "@/lib/prisma-retry";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app/error]", error);
  }, [error]);

  const isDev = process.env.NODE_ENV !== "production";

  return (
    <div className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center px-4 py-16 text-center">
      <h1 className="text-lg font-semibold text-slate-100">Something went wrong</h1>
      <p className="mt-2 text-sm text-slate-400">
        {isTransientMongoError(error)
          ? "MongoDB Atlas is unreachable from this machine. Check DATABASE_URL, Atlas IP allowlist, and that the cluster is not paused."
          : "We could not load this page. Try again, or return to the home page."}
      </p>
      {isDev ? (
        <pre className="mt-4 max-h-40 w-full overflow-auto rounded-lg border border-rose-500/30 bg-rose-950/30 p-3 text-left text-xs text-rose-200">
          {error.message}
          {error.digest ? `\n\ndigest: ${error.digest}` : ""}
        </pre>
      ) : null}
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="rounded-xl bg-cyan-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-cyan-500"
        >
          Try again
        </button>
        <Link
          href="/"
          className="rounded-xl border border-white/20 px-5 py-2.5 text-sm font-semibold text-slate-200 hover:bg-white/5"
        >
          Home
        </Link>
      </div>
    </div>
  );
}
