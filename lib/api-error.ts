import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { isProductionRuntime } from "@/lib/production-secrets";
import { dbUnavailableClientMessage, isTransientMongoError } from "@/lib/prisma-retry";

export type ApiErrorBody = { error: string; code?: string };

type ResolveOpts = {
  route: string;
  /** Shown for unexpected 5xx in production */
  fallback?: string;
  defaultStatus?: number;
};

const SAFE_STATUS_RULES: Array<{ test: (m: string) => boolean; status: number }> = [
  { test: (m) => /already in use|duplicate/i.test(m), status: 409 },
  { test: (m) => /not found|unknown organization|unknown payment|student not found/i.test(m), status: 404 },
  { test: (m) => /not active|not available|pending master approval/i.test(m), status: 404 },
  {
    test: (m) =>
      /IP\s+[\d.]+\s+not allowed|not on your allowlist|Invalid API key|Account number does not match|API access is currently disabled|pending approval|account suspended|account deactivated/i.test(
        m,
      ),
    status: 502,
  },
  { test: (m) => /forbidden|outside your organization|not authorized|does not match/i.test(m), status: 403 },
  { test: (m) => /too many requests|rate limit/i.test(m), status: 429 },
  {
    test: (m) =>
      /programme not found|no fee schedule|invalid |installment plan|cannot activate|only pending|provision failed/i.test(
        m,
      ),
    status: 400,
  },
  {
    test: (m) =>
      /minimum cashout|insufficient balance|set a payout|mobile money number|invalid mobile money|network must be|cannot pay payout|cannot reject payout/i.test(
        m,
      ),
    status: 400,
  },
  { test: (m) => /required|must be set|invalid body|invalid token|expired/i.test(m), status: 400 },
  { test: (m) => /mbiyo_not_configured|not configured/i.test(m), status: 503 },
];

function clientSafeMessage(message: string, status: number): string {
  if (!isProductionRuntime()) return message.slice(0, 400);
  if (status < 500) return sanitizeClientMessage(message).slice(0, 400);
  return sanitizeClientMessage(message);
}

/** Strip paths, Prisma internals, and huge blobs from user-visible errors. */
export function sanitizeClientMessage(message: string): string {
  const m = message.trim();
  if (!m) return "Request could not be completed";
  if (/prisma\.|PrismaClient|mongodb(\+srv)?:\/\/|ECONNREFUSED|ENOTFOUND|at\s+[\w.]+\(/i.test(m)) {
    return "Request could not be completed";
  }
  if (m.length > 240) return `${m.slice(0, 240)}…`;
  return m;
}

export function prismaErrorToBody(e: Prisma.PrismaClientKnownRequestError): ApiErrorBody & { status: number } {
  switch (e.code) {
    case "P2002":
      return { status: 409, error: "A record with this value already exists", code: e.code };
    case "P2025":
      return { status: 404, error: "Record not found", code: e.code };
    case "P2003":
      return { status: 400, error: "Invalid reference", code: e.code };
    case "P2034":
      return { status: 409, error: "Please retry — another update conflicted", code: e.code };
    default:
      return {
        status: 500,
        error: isProductionRuntime() ? "Database error" : `Database error (${e.code})`,
        code: e.code,
      };
  }
}

export function resolveApiError(
  e: unknown,
  opts: ResolveOpts,
): { status: number; body: ApiErrorBody; shouldLog: boolean } {
  const fallback = opts.fallback ?? "Something went wrong. Please try again.";
  const defaultStatus = opts.defaultStatus ?? 500;

  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    const mapped = prismaErrorToBody(e);
    return {
      status: mapped.status,
      body: { error: mapped.error, code: mapped.code },
      shouldLog: mapped.status >= 500,
    };
  }

  if (e instanceof Prisma.PrismaClientValidationError) {
    return {
      status: 500,
      body: {
        error: isProductionRuntime() ? fallback : "Database query validation failed",
        code: "PrismaClientValidationError",
      },
      shouldLog: true,
    };
  }

  if (isTransientMongoError(e)) {
    return {
      status: 503,
      body: {
        error: dbUnavailableClientMessage(e),
        code: "DB_UNAVAILABLE",
      },
      shouldLog: true,
    };
  }

  const msg = e instanceof Error ? e.message : String(e);

  for (const rule of SAFE_STATUS_RULES) {
    if (rule.test(msg)) {
      return {
        status: rule.status,
        body: { error: clientSafeMessage(msg, rule.status) },
        shouldLog: rule.status >= 500,
      };
    }
  }

  const status = defaultStatus;
  return {
    status,
    body: { error: clientSafeMessage(status >= 500 ? fallback : msg, status) },
    shouldLog: status >= 500,
  };
}

export function apiErrorResponse(
  e: unknown,
  opts: ResolveOpts & { code?: string; statusOverride?: number },
): NextResponse<ApiErrorBody> {
  const { status, body, shouldLog } = resolveApiError(e, opts);
  if (shouldLog) console.error(`[${opts.route}]`, e);
  const out: ApiErrorBody = opts.code ? { ...body, code: opts.code } : body;
  return NextResponse.json(out, { status: opts.statusOverride ?? status });
}
