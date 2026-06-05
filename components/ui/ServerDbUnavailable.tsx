import { DB_UNAVAILABLE_MESSAGE } from "@/lib/prisma-retry";

export function ServerDbUnavailable({ title = "Could not load data" }: { title?: string }) {
  return (
    <div
      role="alert"
      className="rounded-xl border border-amber-500/35 bg-amber-950/25 px-4 py-4 text-sm text-amber-100"
    >
      <p className="font-medium text-amber-50">{title}</p>
      <p className="mt-1 text-amber-200/90">{DB_UNAVAILABLE_MESSAGE}</p>
      <p className="mt-2 text-xs text-amber-200/70">
        If this persists, check MongoDB Atlas network access and that your cluster is running.
      </p>
    </div>
  );
}
