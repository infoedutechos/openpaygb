# Checkout card vs OPGB Checkout Card

**Last updated:** 2026-06-11

---

## 1. What is a “checkout card”?

In ODEL HUB Pay, **checkout card** is informal product language for paying **at tuition checkout** using a **stored UGX balance** instead of MoMo, TON, or another live rail.

It is **not** a separate Visa/Mastercard product. Technically it is:

| Term in code | Meaning |
|--------------|---------|
| **OpenPayGB card** / **OpenPayGB platform card** | Closed-loop virtual card — one per student (`OpenPayCard` model) |
| **Checkout rail** | `openpay_card` — API `POST /api/public/checkout/openpay-card-pay` |
| **Checkout UI** | PayWizard checkbox: “Pay tuition with **OpenPayGB card**” |

**Flow**

1. Student (or guest with linked `studentId`) funds the card via TON or MoMo top-up.
2. At `/pay/{orgSlug}` or `/student/pay`, they tick **Pay with OpenPayGB card**.
3. Platform debits `balanceUgx`, confirms tuition `Payment`, and syncs the **OPGB ledger**.

See [OPENPAYGB_PLATFORM_CARD.md](./OPENPAYGB_PLATFORM_CARD.md).

---

## 2. What is an “OPGB Checkout Card”?

**OPGB Checkout Card** is the same rail, described from the **settlement token** perspective:

| Layer | Detail |
|-------|--------|
| **User sees** | `OPGB •••• 1234` masked PAN, UGX balance |
| **Settlement** | **1 OPGB = 1 UGX** internal ledger (`OpgbWallet` / `OpgbLedgerEntry`) |
| **At checkout** | Tuition debit books as `tuition_pay` on the OPGB ledger |
| **Brand** | OpenPayGB (payer-facing) = OPGB (token/settlement) |

So: **OpenPayGB card at checkout = OPGB Checkout Card** — closed-loop UGX/OPGB balance spent on tuition without leaving the platform.

Multi-currency **display** (TON, USDT, etc.) on `GET /api/student/opgb-wallet` is FX-quoted from OPGB; **checkout still spends UGX/OPGB**.

---

## 3. Related APIs

| Action | Route |
|--------|-------|
| Eligibility at checkout | `GET /api/public/checkout/openpay-card-eligibility` |
| Pay tuition from card | `POST /api/public/checkout/openpay-card-pay` |
| Student card status | `GET /api/student/openpay-card` |
| OPGB wallet + FX basket | `GET /api/student/opgb-wallet` |

---

## 4. vs Dex / AMM / P2P

Checkout card is **tuition-only** closed loop. Dex Hub (`/dex/buy`, `/dex/amm`, `/dex/p2p`) handles **fiat↔crypto** and OPGB swaps — see [OPGB_TOKEN_ECOSYSTEM.md](./OPGB_TOKEN_ECOSYSTEM.md).
