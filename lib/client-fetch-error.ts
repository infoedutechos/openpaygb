/** Detect browser fetch failures (aborted request, dev server down, Edge middleware crash, etc.). */
export function isClientFetchNetworkError(err: unknown): boolean {
  if (typeof err === "string") {
    const m = err.toLowerCase().trim();
    return (
      m === "network error" ||
      m.includes("failed to fetch") ||
      m.includes("networkerror") ||
      m.includes("load failed")
    );
  }
  if (!(err instanceof Error)) return false;
  const m = err.message.toLowerCase().trim();
  const name = err.name.toLowerCase();
  return (
    (name === "typeerror" || name === "networkerror" || name === "error") &&
    (m === "network error" ||
      m.includes("failed to fetch") ||
      m.includes("networkerror") ||
      m.includes("load failed") ||
      m.includes("fetch failed"))
  );
}

export function clientFetchErrorMessage(
  err: unknown,
  hint = "Could not reach the server. Start or restart the dev server (npm run dev:clean), wait until it shows Ready, then hard-refresh.",
): string {
  if (isClientFetchNetworkError(err)) return hint;
  return err instanceof Error ? err.message : "Request failed";
}
