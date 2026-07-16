# OpenPay Global Token (OPGB) — ecosystem architecture

**Last updated:** 2026-06-11  
**Product decision:** **Phase 1 peg — 1 OPGB = 1 UGX.** Multi-currency **display basket** (TON, USDT, BTC, ETH, MoMo) follows in Phase 2+ via FX, still settling internally in OPGB-UGX.

---

## Executive summary

OPGB is a **universal internal settlement token** for ODEL HUB / OpenPay Global. Users interact in their preferred currency (Mobile Money, TON, fiat, crypto); the platform books everything through OPGB for faster accounting, cross-currency transfers, and merchant payments.

**Comparable products:** Binance Pay + Revolut + Mobile Money + hybrid DEX + internal settlement token.

**Pending:** on-chain settlement, live MoMo disbursement API. **Shipped:** P2P release/cancel/dispute + 24h auto-release cron + master dispute/withdraw ops (`/admin/master/opgb-ops`).

---

## Architecture (target)

```
Mobile Money / TON / Fiat / Crypto
              │
              ▼
        Fiat & crypto gateways
    (Mbiyo, LivePay, Relworx, TON, …)
              │
              ▼
   OpenPay Global Token (OPGB)
   Phase 1: 1 OPGB = 1 UGX (book entry)
              │
    ┌─────────┼─────────┐
    ▼         ▼         ▼
  Wallet     DEX    Tuition / merchant pay
    │
    ▼
 BTC · ETH · TON · USDT (via liquidity / quotes)
```

**Benefits**

- Single internal settlement asset (OPGB)
- Faster accounting and reconciliation
- Cross-currency transfers
- Mobile Money ↔ crypto bridge
- P2P trading (later)
- Lower transaction costs

---

## 1. Deposit & wallet flow (product notes)

When a user deposits **Mobile Money, TON, or another currency**:

1. The system **immediately converts** the deposited amount into **OPGB** (Phase 1: at 1:1 UGX).
2. **OPGB is credited** to the user's wallet ledger.
3. The system can **convert OPGB back** into the original (or another) currency when needed for withdraw/spend.

This creates a universal internal settlement token while users keep interacting in preferred currencies.

**Implementation target (Phase 1)**

| Step | System action |
|------|----------------|
| Deposit confirmed (webhook / chain) | Credit `WalletLedgerEntry` in OPGB minor units (= UGX) |
| User pays tuition | Debit OPGB (or quote FX at checkout time) |
| User withdraws | Debit OPGB, pay out via original rail |

Reuse patterns from `lib/receipt-lines.ts`, `lib/openpay-card.ts`, checkout webhooks.

---

## 2. DEX concept — “Can this work?”

**Yes**, but as a **hybrid** stack rather than a pure on-chain DEX:

| Layer | Role |
|-------|------|
| **Hybrid DEX** | Custodial matching + optional on-chain settlement later |
| **AMM** | Liquidity pools for OPGB ↔ TON/USDT pairs |
| **Fiat-to-crypto gateway** | Mbiyo / LivePay / Relworx → OPGB |
| **Liquidity pool system** | Platform + market-maker inventory |

**P2P (autonomous):** Users transact with **minimal platform intervention** — offers, escrow, and release rules automated; disputes escalated to ops.

**Today:** `app/dex/*` — onramp, offramp, convert UI; not full AMM/P2P backend.

---

## 3. Buying crypto with fiat (8-step flow)

| Step | User / system |
|------|----------------|
| 1 | User selects a cryptocurrency |
| 2 | User enters fiat amount to spend |
| 3 | System shows crypto amount to receive |
| 4 | System shows all fees/charges |
| 5 | System shows total transaction summary |
| 6 | User clicks **Buy** |
| 7 | Platform verifies: account balance, liquidity, validity |
| 8 | Transaction executes automatically |

**Code path (future):** Dex Hub wizard → quote API → liquidity check → ledger debit/credit → receipt.

---

## 4. Wallet & balance requirements

**Balances shown (with user hide/show):**

- Mobile Money balance  
- TON balance  
- USDT balance  
- BTC balance  
- ETH balance  
- **OPGB balance** (settlement)  

**Features**

- Show / hide balances (UI preference)  
- Portfolio value (FX mark-to-market)  
- Transaction history  
- Deposit / withdraw  
- Swap  
- Buy / sell  

**Phase 1 UI scope:** OPGB (UGX) + linked MoMo/TON rails already in Pay/Dex; full multi-asset wallet in Phase 2.

---

## Peg strategy (your questions A & B)

| Phase | Peg | Notes |
|-------|-----|-------|
| **A — Phase 1 (MVP)** | **1 OPGB = 1 UGX** | Integer-safe ledger; aligns with OpenPayGB card and tuition UGX fees |
| **B — Phase 2+** | **Multi-currency basket display** | Show TON/USDT/BTC/ETH/MoMo balances using FX; **settlement remains OPGB-UGX** until cross-border basket policy is defined |

Do **not** mix multiple pegs in Phase 1 — all external currencies convert **through quoted FX** into OPGB-UGX at deposit time.

---

## What exists today

| Capability | Status | Code / route |
|------------|--------|----------------|
| **OpenPayGB card** (UGX closed-loop) | Shipped | `lib/openpay-card.ts`, `OpenPayCard` model, `/admin/virtual-cards` |
| **Dex Hub** (onramp/offramp/convert) | Partial | `app/dex/*`, `lib/ecosystem/hubs.ts` |
| **MoMo / Mbiyo / LivePay / Relworx** | Integrated | `/api/public/checkout/*`, webhooks |
| **OPGB ledger wallet** | **Phase 1 shipped** | `lib/opgb-ledger.ts`, `GET /api/student/opgb-wallet` |
| **Deposit → OPGB auto-convert** | **On card top-ups** | `confirmOpenPayCardTopup` → `creditOpgbDeposit` |
| **Hybrid DEX / AMM / P2P** | **Phase 3 shipped (custodial)** | `POST /api/student/dex/amm-swap`, `POST /api/student/dex/p2p/escrow`, `/dex/amm`, `/dex/p2p` |
| **Fiat buy crypto wizard (8 steps)** | **Shipped** | `/dex/buy`, `GET /api/public/dex/buy-quote` |
| **Multi-currency wallet display** | **Phase 4 shipped** | Real crypto custody + FX preview on `GET /api/student/opgb-wallet` |
| **Withdraw OPGB/crypto** | **Phase 4 shipped** | `POST /api/student/opgb-wallet/withdraw`, `/dex/offramp` |
| **AMM liquidity pools** | **Phase 4 shipped** | `DexAmmPool`, `lib/dex-amm-pool.ts` |
| **P2P release / cancel / dispute** | **Phase 4 shipped** | `lib/dex-p2p-release.ts`, escrow APIs |
| **Auto buy settlement (student)** | **Phase 4 shipped** | `POST /api/student/dex/buy` → instant OPGB debit + crypto credit |

---

## Proposed implementation phases

### Phase 1 — OPGB-UGX settlement ledger (**shipped**)

1. Prisma: `OpgbWallet`, `OpgbLedgerEntry` (OPGB minor units = UGX).  
2. Card top-up confirm → `creditOpgbDeposit` (MoMo / TON / card rails).  
3. Tuition from OpenPayGB card → `debitOpgbForTuition` + legacy `reconcileOpgbWalletWithCard`.  
4. Student API: `GET /api/student/opgb-wallet` (Phase 2 basket preview lines).  
5. Dex buy quote: `GET /api/public/dex/buy-quote`.  
6. **Ops:** `npm run db:push` — creates `opgb_wallets` / `opgb_ledger_entries` (applied on Atlas).

### Phase 2 — Multi-currency wallet UI (**shipped**)

1. FX from live TON feed + static fallbacks (`lib/opgb-fx-rates.ts`).  
2. Display basket (MoMo, TON, USDT, BTC, ETH, OPGB) — amounts **quoted from OPGB** (`quotedFromOpgb: true`).  
3. Portfolio value line (`portfolioValueUgx`).  
4. Fiat-buy wizard at `/dex/buy`; buy queue API at `POST /api/public/dex/buy`.

### Phase 3 — Hybrid DEX + P2P (**shipped**)

1. AMM: quote `GET /api/public/dex/amm-quote` · execute `POST /api/student/dex/amm-swap` · UI `/dex/amm`.  
2. P2P: book `GET /api/public/dex/p2p` · escrow `POST /api/student/dex/p2p/escrow` · UI `/dex/p2p`.  
3. Buy orders: `DexBuyOrder` via public queue or student instant settle.

### Phase 4 — Full ecosystem loop (**shipped**)

1. **Custodial crypto:** `OpgbAssetBalance` — AMM/buy credits TON/USDT/BTC/ETH.  
2. **Withdraw:** `OpgbWithdrawRequest` + `/dex/offramp` UI.  
3. **AMM pools:** `DexAmmPool` constant-product reserves (not demo constant).  
4. **P2P lifecycle:** release, cancel, dispute, 24h auto-release via `/api/cron/dex-settle`.  
5. **Wallet P2P → OPGB:** card transfers sync ledger debit/credit.  
6. **Pending:** on-chain delivery, live payout disbursement, master dispute dashboard.

**Checkout card:** [OPGB_CHECKOUT_CARD.md](./OPGB_CHECKOUT_CARD.md)

---

## Accounts & deployment (saved in docs)

| Item | Document |
|------|----------|
| Vercel login `info.edutechos@gmail.com` | [VERCEL_ODELPAY_DEPLOY.md](./VERCEL_ODELPAY_DEPLOY.md), [DEPLOYMENT_ENV_PRODUCTION.md](./DEPLOYMENT_ENV_PRODUCTION.md) |
| GitHub `openpayglobal/openpaygb` | [README.md](./README.md), [PROJECT_DESCRIPTION.md](./PROJECT_DESCRIPTION.md) |
| `.env` ↔ Master Admin | [LOCAL_DEV_AND_CREDENTIALS.md](./LOCAL_DEV_AND_CREDENTIALS.md) — `npm run deployment:env-audit` |
| Workspace portal & verify | [SCHOOL_WORKSPACE_SELF_REGISTER.md](./SCHOOL_WORKSPACE_SELF_REGISTER.md), [ORGANIZATION_REGISTRATION.md](./ORGANIZATION_REGISTRATION.md) |
| Telegram | [TELEGRAM_BOT_DEPLOYMENT.md](./TELEGRAM_BOT_DEPLOYMENT.md), `GET /api/public/telegram-config` |
| Vercel Preview “Blocked” | [VERCEL_BUILD_FAILURES.md](./VERCEL_BUILD_FAILURES.md) |

---

## Related docs

- [OPENPAYGB_PLATFORM_CARD.md](./OPENPAYGB_PLATFORM_CARD.md)  
- [MULTI_TENANT_FLOW.md](./MULTI_TENANT_FLOW.md)  
- [LOCAL_DEV_AND_CREDENTIALS.md](./LOCAL_DEV_AND_CREDENTIALS.md)  
- [APP_STATUS_AUDIT.md](./APP_STATUS_AUDIT.md)
