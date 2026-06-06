# Error hardening (2026-06-03, audited 2026-06-05)

## Coverage audit

Run `node scripts/audit-api-error-hardening.cjs` for a live count.

| Metric | Approx. (263 routes) |
|--------|---------------------|
| Uses `apiErrorResponse` | ~48 |
| `catch` without `apiErrorResponse` | ~152 |
| No `catch` block | ~63 |

**Tuition-critical paths** (checkout, auth, student, receipts, master, knowledge, webhooks) are largely hardened. **Play / game / legacy admin** routes (sync, quiz, tasks, upgrades) often return raw error messages — lower priority for tuition go-live but should be migrated over time.

## Central helper: `lib/api-error.ts`

- Maps **Prisma** codes (`P2002`, `P2025`, `P2003`, `P2034`) to stable HTTP statuses
- Classifies **business errors** (not found, not active, programme/fee issues) to 4xx
- In **production**, 5xx responses use a generic `fallback` message — no stack traces or connection strings
- `sanitizeClientMessage()` strips Prisma/Mongo paths from any client-visible text
- `apiErrorResponse(e, { route, fallback })` logs unexpected errors once with a route tag

## UI boundaries

- `app/error.tsx` — segment error boundary with retry + home link (dev shows message)
- `app/global-error.tsx` — root fallback when the root layout fails

## Tuition API routes updated

Public checkout, payments, registration, receipts, auth (login/forgot/reset), programme quote, master org approve, legacy collect — all use `apiErrorResponse` in top-level `catch` blocks.

## Client fetch

`utils/read-json-response.ts` detects **HTML error pages** (compile failures) and returns a clearer message instead of “Invalid JSON”.

## Usage for new routes

```ts
import { apiErrorResponse } from "@/lib/api-error";

export async function POST(req: Request) {
  try {
    // ...
  } catch (e) {
    return apiErrorResponse(e, { route: "my/route", fallback: "Could not complete request" });
  }
}
```
