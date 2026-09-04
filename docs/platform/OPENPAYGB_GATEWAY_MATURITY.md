# OpenPayGB — gateway maturity assessment

**Date:** 2026-09-04 · **Brand:** OpenPayGB (OPGB)  
**Related:** [PLATFORM_UPDATE_2026-09.md](./PLATFORM_UPDATE_2026-09.md) · [OPENPAYGB_PAYMENT_PROVIDER.md](./OPENPAYGB_PAYMENT_PROVIDER.md) · [CARD_ISSUING.md](./CARD_ISSUING.md) · [BACKLOG.md](../product/BACKLOG.md)

---

## Verdict (plain)

**OpenPayGB is a real, multi-rail payment platform for East Africa education + merchant collect**, now with **bank-card acquiring (webhook + PayWizard)** and **auto MoMo cashout when PSP keys exist**, plus a **Visa/LivePay network-issuing scaffold**. It is still not a zero-ops Stripe clone until Flutterwave/Paystack keys, PSP float, and a BIN sponsor are live in production.

| Dimension | Score | Notes |
|-----------|-------|--------|
| Multi-rail collect (UG MoMo) | **Strong** | LivePay, Relworx, VixonPay, Mbiyo (non-UG), TON, closed-loop card |
| Merchant PSP (charges + hosted checkout + fees + WL) | **Strong** | Partner API, developer dashboard, school settlement twin |
| Settlement / cashout | **Strong (code)** | Auto live send when LivePay/Relworx configured; `OPENPAYGB_CASHOUT_LIVE=0` forces queue-only |
| Platform wallet card | **Good** | Issue/fund MoMo or TON; pay tuition from balance |
| Ops / Master control | **Strong** | Deployment env, UG MoMo keys panel, provider toggles, OPGB console |
| Bank card acquiring | **Ready (code)** | Flutterwave/Paystack start + webhooks + PayWizard when keys set |
| Network Visa/MC issuing | **Scaffold** | LivePay URL or Visa VDP mTLS; needs BIN program for live PANs |
| Multi-country LivePay | **Limited** | UG first; Mbiyo covers other corridors |
| Hot-wallet TON delivery | **Ops desk** | Withdraw queue; not automatic on-chain |
| SMS/WhatsApp reminders | **Code ready** | Needs Africa’s Talking / WhatsApp env |

**One-line answer:** OPGB is a **global-class-shaped multi-rail gateway in code**; production “seamless” still needs **PSP keys + float + BIN sponsor** (and your Visa Developer project wired for issuing).

---

## What “multi-dimensional” means here (shipped)

1. **Tuition checkout** — `/pay/{orgSlug}` (TON, LivePay, Relworx, VixonPay, Mbiyo, OpenPayGB card, **bank card**)  
2. **Merchant provider** — `/opgb` + Partner charges + hosted checkout + white-label fees  
3. **Closed-loop wallet** — OpenPayGB platform card (activate/fund MoMo or TON)  
4. **School-as-merchant** — `/admin/school-settlement`  
5. **Developer portal** — keys, webhooks, settlement, branding  
6. **Master ops** — fees, cashouts, cards, UG MoMo credentials, deployment env, card issuing probe  
7. **TMA** — Telegram Mini App pay + card top-up  
8. **Acquiring webhooks** — `/api/webhooks/flutterwave`, `/api/webhooks/paystack`  
9. **Issuing scaffold** — `/api/master/card-issuing/issue`, `/api/webhooks/visa-issuing`  

---

## What “seamless” still requires (ops / product)

| Gap | Why it matters |
|-----|----------------|
| Paste LivePay/Relworx/VixonPay **collect** keys in MAC `#ug-momo-credentials` | Without them, UG MoMo is sandbox-only in non-prod |
| Paste **webhook** secrets in PSP dashboards | Confirms payments automatically |
| Funded PSP float (and leave `OPENPAYGB_CASHOUT_LIVE` unset or `1`) | Merchant/school cashout without manual mark-paid |
| `FLUTTERWAVE_*` or `PAYSTACK_*` + dashboard webhook URL | Bank Visa/MC at tuition checkout |
| Visa Developer certs + BIN sponsor / LivePay issuing URL | Live network Visa/MC cards (not closed-loop) |
| Production go-live checklist | [PRODUCTION_GO_LIVE.md](../deployment/PRODUCTION_GO_LIVE.md) |

---

## Honest maturity labels

| Label | Fits OPGB now? |
|-------|----------------|
| Multi-rail MoMo + TON education gateway | **Yes** |
| Merchant payment provider (charges API) | **Yes** |
| Closed-loop wallet / campus card | **Yes** |
| Bank Visa/MC acquiring (code path) | **Yes** (needs acquirer keys) |
| Stripe-class acquiring + issuing + global settle | **Almost — issuing needs BIN** |
| “Set and forget” cashout when keys+float exist | **Yes** (opt out with `OPENPAYGB_CASHOUT_LIVE=0`) |
