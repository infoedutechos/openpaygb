# ODEL HUB TON Pay — user stories

Derived from the **ODEL HUB – TON Pay System** flow (Telegram, Web + TON Connect, Admin, MoMo bridge, smart receipts). IDs are stable for traceability in GitHub issues.

**Implementation snapshot:** Next.js 15 + Prisma/MongoDB; Telegram flows in `lib/telegram/` + `POST /api/webhooks/telegram`; TON Connect on `/pay`; TonAPI + `GET /api/cron/confirm-ton` for inbound TON matching (`ref:<paymentId>` in memo or amount+FIFO); MoMo + `POST /api/webhooks/momo`; public status `GET /api/payments/:id/public`; PDF `GET /api/receipts/:paymentId/pdf`; admin CSV export, students list, monthly bars.

---

## Epic A — Platform & data foundation

| ID | As a… | I want… | So that… | Acceptance criteria |
|----|---------|---------|----------|---------------------|
| A1 | Developer | A single Next.js app on Vercel with route handlers | Frontend and backend share one deploy | `next build` succeeds; `/api/health` returns DB connectivity |
| A2 | Developer | MongoDB models for core entities | Data is structured and queryable | Collections exist for programmes, students, payments, admins, FX |
| A3 | Operator | A seed script | Demo data exists on a fresh cluster | Programmes (BEP…PGD), FX row, admin user created idempotently enough for dev |

---

## Epic B — Student (Telegram bot)

| ID | As a… | I want… | So that… | Acceptance criteria |
|----|---------|---------|----------|---------------------|
| B1 | Student | `/start` and a main menu | I can navigate the bot | Menu exposes Programmes, My Profile, Payments, Help |
| B2 | Student | Pick programme, year, semester | Fees match my cohort | Bot validates selections against `Programme` fee lines |
| B3 | Student | See UGX breakdown + TON estimate | I know what to send | Totals match server quote; rate snapshot stored on payment |
| B4 | Student | See wallet + “Open wallet” / “I have paid” | I can complete TON transfer | Deep link optional; payment stays `pending` until verified |
| B5 | Student | Success + tx hash + receipt | I have proof | After confirmation, receipt payload available |
| B6 | System | Telegram updates via webhook | Bot stays serverless | `POST /api/webhooks/telegram` verifies secret and is ready to parse updates |

---

## Epic C — Student (Web + TON Connect)

| ID | As a… | I want… | So that… | Acceptance criteria |
|----|---------|---------|----------|---------------------|
| C1 | Student | A landing page | I understand the programme | Clear CTA to pay flow |
| C2 | Student | Programme grid / select | I pick my path | Programme list from `/api/programmes` |
| C3 | Student | Fee card with UGX + TON | I see conversion | Uses `/api/programmes/{code}/quote` |
| C4 | Student | TON Connect (Tonkeeper, MyTonWallet, OpenMask, Telegram) | I sign in-wallet | `@tonconnect/ui-react` + `TonConnectButton` + `sendTransaction` |
| C5 | Student | Confirm screen with memo/context | Wallet shows readable transfer | Memo includes `ref:<paymentId>`; optional comment payload |
| C6 | Student | Processing + success states | I trust the flow | Polling `GET /api/payments/:id/public`; cron + TonAPI confirms on-chain |
| C7 | Student | Download / view receipt | I can archive proof | HTML receipt + QR + **PDF** download |

*Implemented:* C1–C7 at MVP level; manual admin confirm still available if indexer misses a tx.

---

## Epic D — Admin dashboard

| ID | As a… | I want… | So that… | Acceptance criteria |
|----|---------|---------|----------|---------------------|
| D1 | Admin | Secure login | Only staff access metrics | JWT in httpOnly cookie; `/api/auth/me` gates UI |
| D2 | Admin | Dashboard KPIs | I see health | TON collections, payment count, student count from `/api/admin/summary` |
| D3 | Admin | Payments table with filters | I can reconcile | List from `/api/payments` (UI filters follow-up); status + tx hash |
| D4 | Admin | Student profile + history | I can support a payer | `/api/students/:id` shows payments |
| D5 | Admin | Confirm / fail a payment | Chain or MoMo evidence maps to ledger | `PATCH /api/payments/:id` updates status + hash |
| D6 | Admin | Reports export | Finance can analyze | CSV export + monthly TON series; dashboard chart bars; PDF receipts per payment |

*Implemented:* D1–D6 at MVP level (table filters still optional).

---

## Epic E — Mobile Money → TON bridge

| ID | As a… | I want… | So that… | Acceptance criteria |
|----|---------|---------|----------|---------------------|
| E1 | Student | Pay via MTN/Airtel | I need not hold TON | MoMo collection API integrated (follow-up) |
| E2 | System | Verify MoMo callback | Fraud is reduced | `POST /api/webhooks/momo` verifies secret; parses reference + success; confirms ledger |
| E3 | System | Convert UGX→TON | Treasury receives TON | `enqueueUgXtoTonBridge` hook (implement exchange + treasury send) |
| E4 | System | Mark payment confirmed | Student is cleared | `rail=momo_bridge`; `handleFirstTimeConfirmation` |
| E5 | Student | Smart receipt via email/Telegram | I get proof | Confirm notify via bot; email batch (follow-up) |

*Implemented:* E2, E4; partial E3 (hook only); E1/E5 follow-ups (Collect API + mailer).

---

## Epic F — Smart receipts

| ID | As a… | I want… | So that… | Acceptance criteria |
|----|---------|---------|----------|---------------------|
| F1 | Anyone with link | QR / verify endpoint | Quick validation | `GET /api/receipts/:id` returns JSON; QR encodes URL |
| F2 | Student | PDF download | I can file offline | `GET /api/receipts/:paymentId/pdf` (`pdf-lib`) |
| F3 | Admin | Same receipt as student | Support is consistent | Admin can preview pending; same PDF route |
| F4 | Auditor | Tamper-evident data | Trust is anchored | Payload includes tx hash + rate snapshot |

*Implemented:* F1–F4 at MVP level.

---

## Epic G — TON settlement automation (web + Telegram rails)

| ID | As a… | I want… | So that… | Acceptance criteria |
|----|---------|---------|----------|---------------------|
| G1 | Operator | Cron hits TonAPI | Pending TON payments clear without hand-matching | `GET /api/cron/confirm-ton` + `vercel.json` schedule |
| G2 | System | Match memo/ref or amount | Ambiguous duplicates reduced | Memo includes `ref:<id>`; FIFO nano match fallback |

*Implemented:* G1–G2 (configure `CRON_SECRET`, `TONAPI_KEY`, settlement wallet address).

---

## Suggested GitHub labels

`area:telegram`, `area:web`, `area:admin`, `area:bridge`, `area:receipts`, `type:feature`, `type:tech-debt`, `priority:P1`.
