# OpenPayGB platform virtual card — uses by user category

The **OpenPayGB platform card** is a **closed-loop UGX ledger** on ODEL HUB Pay (not a bank-issued Visa/Mastercard). It is **student-scoped**: one card per student record, platform-wide across schools. Master Admin can enable/disable it and set the TON issue fee.

**Rail:** `openpay_card` · **Brand:** OpenPayGB · **Currency:** UGX balance

**Related:** [VIRTUAL_CARD_INVESTIGATION.md](./VIRTUAL_CARD_INVESTIGATION.md) (closed-loop MVP shipped) · [TELEGRAM_MINI_APP.md](./TELEGRAM_MINI_APP.md) (TMA Card tab)

---

## Summary matrix

| User category | Primary uses | UI / entry |
|---------------|--------------|------------|
| **Student** | Opt-in, activate, fund, pay tuition, view balance | `/student/card`, `/student/pay`, `/my/*`, TMA Card/Pay tabs |
| **Guest payer** | Pay tuition from card **if** checkout session ties to a student with active card | `/pay/{orgSlug}` (OpenPayGB checkbox when eligible) |
| **School admin** | No direct card UI — sees tuition payments on rail `openpay_card` in payment history | `/admin` payments |
| **Master admin** | Enable platform card, issue fee, registry of all cards/balances | `/admin/master#openpay-card-settings`, `#openpay-cards-overview` |
| **Telegram (TMA)** | Card view, MoMo top-up, pay tuition from balance | `/tma` Card + Pay tabs |

---

## 1. Students (logged-in)

### A. Get and activate a card

| Step | API / route |
|------|-------------|
| Opt-in (reserve card) | `POST /api/student/openpay-card/opt-in` |
| View status & balance | `GET /api/student/openpay-card` |
| Pay issue fee (TON) | `POST /api/student/openpay-card/issue/transfer` |
| Pay issue fee (MoMo) | `POST /api/student/openpay-card/issue/momo-start` (VixonPay / LivePay / Relworx) |

**UI:** `components/student/OpenPayCardPanel.tsx` at `/student/card`

**States:** `pending_issue` → `active` (after issue fee confirmed)

### B. Fund the card (top-up)

| Method | API |
|--------|-----|
| TON | `POST /api/student/openpay-card/fund/transfer` |
| Mobile money | `POST /api/student/openpay-card/fund/momo-start` |

Balance increases after webhook confirms MoMo or TON transfer.

### C. Pay tuition from card balance

| Surface | API |
|---------|-----|
| Student portal pay flow | `POST /api/public/checkout/openpay-card-pay` |
| Pay wizard (if same student session) | Same API via `StudentTuitionFlow` / eligibility check |
| Telegram Mini App | `TmaPayFlow` → `openpay-card-pay` |

**Rules:** Card must be `active`, platform card enabled, balance ≥ tuition amount. Payment rail stored as `openpay_card`; receipt and tuition progress update like other confirmed payments.

### D. Notifications

- **Telegram:** card top-up confirmation via `notifyTelegramCardTopup` (`lib/telegram/notify-extended.ts`)
- **Receipt:** standard `/receipt/{paymentId}` after confirmed tuition pay

### E. Student portal surfaces

- Sidebar **Virtual card** → `/student/card`
- **Pay tuition** → OpenPayGB checkbox when `canPayTuition`
- Profile / dashboard may show balance via tuition APIs

---

## 2. Guest payers (`/pay/{orgSlug}`)

Guests **cannot** issue or fund a card without becoming a student record.

| Capability | Condition |
|------------|-----------|
| Pay with OpenPayGB at checkout | Guest checkout has linked `studentId` (from prior session or `POST /api/public/checkout/student`) **and** `GET /api/public/checkout/openpay-card-eligibility` returns active card + sufficient balance |

**UI:** `PayWizard.tsx` — “Pay with OpenPayGB card” when platform enabled and eligible.

**Typical flow:** Student funds card while logged in → returns as guest with same student cookie/token → pays fees without MoMo/TON.

---

## 3. School admins (`org_admin`)

No card issuance or balance management for the school.

| What they see | Where |
|---------------|--------|
| Tuition payments with rail **openpay_card** | Admin payments list / exports |
| No per-school card fee split | Card is **platform** product; issue fee goes to platform TON/MoMo rails |

School admins configure **programmes and fees**, not the virtual card product.

---

## 4. Master admin (`master`)

| Capability | Location |
|------------|----------|
| Enable/disable platform card for all students | `MasterOpenPayCardSettings` → `openPayCardEnabled` |
| Set TON issue fee | `openPayCardIssueFeeTon` |
| Toggle in payment providers hub | `/admin/master#payment-providers` → OpenPayGB virtual card |
| Registry: all cards, balances, status | `MasterOpenPayCardsOverview` → `GET /api/master/openpay-cards` |
| Platform metrics on TMA master dashboard | Active cards count, total UGX on cards (`lib/tma-session.ts` master summary) |

---

## 5. Telegram Mini App

| Tab | Card features |
|-----|----------------|
| **Card** | Masked PAN, balance, `TmaCardTopup` (MoMo fund via `/api/student/openpay-card/fund/momo-start`) |
| **Pay** | `TmaPayFlow` — OpenPayGB Card method when `data.card` present |
| **Home / master** | Master admin links to card registry |

Requires student (or admin) session from `POST /api/tma/session`. Card top-up uses same MoMo rails as web.

---

## 6. What the card is **not**

| Not supported today | Notes |
|---------------------|--------|
| Bank card / Visa debit at merchants | Closed-loop UGX only |
| School-admin-issued cards | Platform-wide, student opt-in |
| P2P transfers between students | Balance is per-student ledger |
| Guest card creation | Must opt-in as student |
| Separate card per school | One `OpenPayCard` per `studentId` across orgs |

**Bank card** in TMA shows “coming soon” (`TmaPayFlow`).

---

## 7. Technical reference

| Area | Path |
|------|------|
| Core logic | `lib/openpay-card.ts`, `lib/openpay-card-momo-topup.ts` |
| Settings | `lib/openpay-card-settings.ts` |
| Public config | `GET /api/public/openpay-card-config` |
| Eligibility (guest) | `GET /api/public/checkout/openpay-card-eligibility` |
| Tuition pay | `POST /api/public/checkout/openpay-card-pay` |
| Schema | `OpenPayCard`, `OpenPayCardTopup` in `prisma/schema.prisma` |
| MoMo / dev guide | [VIXONPAY_VIRTUAL_CARD_AND_DEV.md](./VIXONPAY_VIRTUAL_CARD_AND_DEV.md) |

---

## 8. Benefits by category (holistic)

### Students

- **Wallet for tuition** — preload UGX via MoMo or TON, pay fees in one tap without STK each time
- **Cross-channel** — web portal, guest pay (when linked), Telegram Mini App
- **Progress tracking** — card payments confirm like MoMo/TON; receipts and balance panels update
- **Lower friction repeat pay** — especially installments once balance is funded

### Guests

- **Returning payers** with a funded student profile can checkout without external rails if balance covers quote

### School admins

- **Cleaner reconciliation** — `openpay_card` rail appears in payment reports like other rails
- **No PSP setup** — platform operates the card; school does not integrate VixonPay/LivePay for card product

### Master admin

- **Platform revenue lever** — TON (or MoMo) issue fee on activation
- **Liquidity oversight** — total UGX float on active cards in master overview
- **Product toggle** — disable card platform-wide without code deploy

### Ecosystem (Telegram)

- **Fintech UX** — card tab, balance, top-up, in-app tuition pay align with Mini App spec
- **Push notifications** on top-up and payment confirmed
