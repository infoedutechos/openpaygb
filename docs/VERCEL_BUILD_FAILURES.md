# Vercel build failures — investigation log

**Last updated:** 2026-06-03

This document records production/preview deploy failures on `odelhub` / `odelhub-pay` and their fixes.

---

## Symptom: `Can't resolve '.prisma/client/index-browser'`

**Seen on:** Preview + Production builds (2026-06-03)  
**Import trace (example):**

```
lib/programme-fee-labels.ts
  → lib/receipt-ledger.ts
    → components/receipt/ReceiptLedgerAccount.tsx ("use client")
```

### Root cause

Client components imported server modules that **runtime-import** `@prisma/client`. Next.js tries to bundle Prisma for the browser and fails because `.prisma/client/index-browser` is not generated for that graph.

### Fix (applied)

| Module | Role |
|--------|------|
| `lib/receipt-ledger-types.ts` | Client-safe ledger types |
| `lib/receipt-ledger-display.ts` | `formatLedgerDateDisplay` only |
| `lib/programme-fee-recurrence-shared.ts` | String union instead of Prisma enum |
| `lib/programme-fee-labels.ts` | No `@prisma/client` runtime import |

Client components import **types/display only** — never `lib/receipt-ledger.ts` (server builder).

### Verify locally

```powershell
npm run dev:kill
npm run db:generate
npm run build
```

---

## Symptom: Prisma `EPERM` on Windows (local only)

Dev server locks `query_engine-windows.dll.node`. Not a Vercel issue.

```powershell
npm run dev:kill
npm run db:generate
```

---

## Prevention

- Do not import `@prisma/client` (even enums) from files reachable by `"use client"` components.
- Use `import type` only when the module is server-only; prefer shared string unions in `lib/*-shared.ts`.
- Run `npm run build` before pushing to `main`.

---

## Related

- [LEDGER_RECEIPTS_AND_SCHOOL_UNITS.md](./LEDGER_RECEIPTS_AND_SCHOOL_UNITS.md)
- [PRISMA_COMMANDS.md](./PRISMA_COMMANDS.md)
