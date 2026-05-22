# Economics & settlement (UGX, TON, FX)

How money amounts flow through ODEL HUB Pay: programme fees in **UGX**, conversion via **UGX per TON**, on-chain settlement in **TON**, and optional **MoMo → bridge** paths.

---

## Fee schedule

- **`Programme`** holds **programme codes** and names per **organization**.
- **`ProgrammeFee`** rows tie **year** + **semester** to **tuitionUgx** and **functionalFeesUgx**.
- Totals for a term: **tuition + functional** (see `feeTotal` in `lib/money.ts`).

---

## FX (UGX per 1 TON)

- **`FxRate`** documents are **per organization** (`organizationId`), ordered by **`effectiveAt`**.
- **`getActiveUgxPerTon`** (`lib/fx.ts`) returns the latest row or **`DEFAULT_UGX_PER_TON`** from env.
- Admins can append a new rate via **`POST /api/fx/rate`** (resolved org from session or `?orgSlug=` for masters).

---

## Quotes & payments

- **Quote:** `ugxToTon(totalUgx, ugxPerTon)` produces the **TON** amount shown to the payer (`lib/money.ts`).
- **Payment** stores **`ugxPerTonSnapshot`**, **`tonAmount`**, **`totalUgx`**, and **`destinationWallet`** (org wallet or fallback constant) at creation (`create-payment` flow).

---

## Rails & bridge

- **TON** — primary rail; memo / TonAPI confirmation match payments (`ref:<paymentId>`).
- **MoMo** — collections then **`POST /api/webhooks/momo`**; bridge hooks in `lib/bridge/settlement.ts` for UGX→TON settlement (integrate exchange / treasury as needed).

---

## Related code

| Topic | Location |
|--------|----------|
| Math | `lib/money.ts` |
| FX | `lib/fx.ts`, `app/api/fx/rate/route.ts` |
| Payment creation | `lib/create-payment.ts` |
| Bridge | `lib/bridge/settlement.ts` |
