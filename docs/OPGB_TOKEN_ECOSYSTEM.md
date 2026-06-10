# OpenPay Global Token (OPGB) — ecosystem architecture

**Last updated:** 2026-06-03

This document maps the **target OPGB settlement model** (from product notes) to what exists in ODELHUB-Pay today and the phased build path.

---

## Concept

OPGB is an **internal settlement token** — not necessarily an on-chain ERC-20 on day one.

```
Mobile Money / TON / Fiat
         │
         ▼
   Fiat & crypto gateways
         │
         ▼
 OpenPay Global Token (OPGB)
    ┌────┼────┐
    ▼    ▼    ▼
 Wallet  DEX  Tuition / merchant pay
    │
    ▼
 BTC · ETH · TON · USDT (via liquidity / AMM)
```

**Benefits:** single ledger asset, faster accounting, cross-currency transfers, MoMo ↔ crypto bridge, lower reconciliation cost.

---

## What exists today

| Capability | Status | Code / route |
|------------|--------|----------------|
| **OpenPayGB card** (UGX closed-loop balance) | Shipped | `lib/openpay-card.ts`, `OpenPayCard` Prisma model |
| **Dex Hub** (TON onramp/offramp, convert) | Partial UI + APIs | `app/dex/*`, `lib/ecosystem/hubs.ts` |
| **Mbiyo / LivePay / MoMo rails** | Integrated | Checkout, webhooks, Master deployment env |
| **Universal OPGB wallet** (multi-currency balances) | Not built | — |
| **Deposit → OPGB auto-convert** | Not built | — |
| **Hybrid DEX / AMM / P2P** | Not built | — |
| **Buy crypto with fiat wizard** (steps 1–8 in notes) | Not built | Dex onramp is closest |

Today, **OpenPayGB card** is the first concrete “OPGB” product: UGX-denominated platform card with masked PAN `OPGB ••••`.

---

## Target wallet view (DEX phase)

Per product notes, users should see (with show/hide):

- Mobile Money balance  
- TON · USDT · BTC · ETH  
- **OPGB balance** (settlement)  
- Portfolio value, history, deposit/withdraw, swap, buy/sell  

Implementation will require new Prisma models (e.g. `WalletAccount`, `WalletBalance`, `LedgerEntry`) and rate/liquidity services — **not** a extension of tuition `Payment` alone.

---

## Proposed phases

### Phase 1 — Settlement ledger (OPGB as book entry)

1. Define `OPGB` as internal unit (1 OPGB = 1 UGX for Uganda MVP, or pegged basket later).  
2. On MoMo/TON deposit success → credit `WalletBalance` in OPGB.  
3. Tuition checkout debits OPGB (or converts at quote time).  
4. Reuse receipt/ledger patterns from `lib/receipt-lines.ts`.

### Phase 2 — Multi-currency display

1. FX quotes from existing `FxRate` + external feeds.  
2. Wallet UI with hide/show toggles (client-only preference in `localStorage` or user settings).  
3. Link Dex Hub routes to OPGB balances.

### Phase 3 — Hybrid DEX

1. Liquidity pools (custodial MVP; optional on-chain later).  
2. Fiat buy flow: select asset → enter fiat → fees → summary → execute (notes steps 1–8).  
3. P2P offers with platform escrow (autonomous matching later).

---

## Master Admin & deployment env

DEX and gateway secrets are already registered in `lib/deployment-env-registry.ts` and visible at **`/admin/master#deployment-environment`**.

- Values resolve: **Master overrides** → Vercel/process env (`.env`).  
- Audit local `.env` vs registry: `npm run deployment:env-audit`.  
- Push to Master + Vercel: `npm run deployment:provision-sync`.

`BOT_TOKEN` / `TELEGRAM_BOT_TOKEN` are **not** auto-generated — paste from BotFather; status at `#telegram-hub` and `GET /api/public/telegram-config`.

---

## Related docs

- [OPENPAYGB_PLATFORM_CARD.md](./OPENPAYGB_PLATFORM_CARD.md)  
- [MULTI_TENANT_FLOW.md](./MULTI_TENANT_FLOW.md)  
- [LOCAL_DEV_AND_CREDENTIALS.md](./LOCAL_DEV_AND_CREDENTIALS.md)  
- [TELEGRAM_BOT_DEPLOYMENT.md](./TELEGRAM_BOT_DEPLOYMENT.md)
