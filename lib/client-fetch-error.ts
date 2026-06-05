/** Detect browser fetch failures (aborted request, dev server down, Edge middleware crash, etc.). */
export function isClientFetchNetworkError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const m = err.message.toLowerCase();
  return (
    err.name === "TypeError" &&
    (m === "network error" ||
      m.includes("failed to fetch") ||
      m.includes("networkerror") ||
      m.includes("load failed"))
  );
}

export function clientFetchErrorMessage(
  err: unknown,
  hint = "Could not reach the server. Start or restart the dev server (npm run dev:clean), wait until it shows Ready, then hard-refresh.",
): string {
  if (isClientFetchNetworkError(err)) return hint;
  return err instanceof Error ? err.message : "Request failed";
}
