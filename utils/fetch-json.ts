/**
 * fetch() wrapper — turns browser NetworkError into a clear message when dev is down or compiling.
 */
export async function fetchJson(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(input, init);
  } catch (e) {
    const raw = e instanceof Error ? e.message : String(e);
    if (/network|fetch|failed to fetch|load failed/i.test(raw)) {
      throw new Error(
        "Could not reach the server. Ensure `npm run dev` is running on port 3000, wait for “Ready”, then refresh.",
      );
    }
    throw e instanceof Error ? e : new Error(raw || "Request failed");
  }
}
