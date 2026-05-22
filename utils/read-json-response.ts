/**
 * Safe JSON parse for fetch() responses. Avoids "Unexpected end of JSON input" when the
 * server returns an empty body (500 during compile, proxy error, aborted request, etc.).
 */
export type ReadJsonResult<T> =
  | { ok: true; status: number; data: T }
  | { ok: false; status: number; error: string; data?: unknown };

export async function readJsonResponse<T = unknown>(res: Response): Promise<ReadJsonResult<T>> {
  const status = res.status;
  let text = "";
  try {
    text = await res.text();
  } catch {
    return {
      ok: false,
      status,
      error: `Could not read response body (${status})`,
    };
  }

  const trimmed = text.trim();
  if (!trimmed) {
    return {
      ok: false,
      status,
      error: res.ok
        ? `Empty response from server (${status})`
        : `Request failed (${status}) with an empty body — check dev server logs, run prisma generate, and retry.`,
    };
  }

  try {
    const data = JSON.parse(trimmed) as T;
    if (!res.ok) {
      const msg =
        typeof data === "object" && data !== null && "error" in data && typeof (data as { error: unknown }).error === "string"
          ? (data as { error: string }).error
          : `Request failed (${status})`;
      return { ok: false, status, error: msg, data };
    }
    return { ok: true, status, data };
  } catch {
    const snippet = trimmed.slice(0, 160).replace(/\s+/g, " ");
    return {
      ok: false,
      status,
      error: `Invalid JSON (${status}): ${snippet}${trimmed.length > 160 ? "…" : ""}`,
    };
  }
}
